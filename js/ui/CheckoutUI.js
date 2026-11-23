import { Cliente } from "../modelo/Cliente.js";
import { Transaccion } from "../modelo/Transaccion.js";
import { PagoTarjeta } from "../pagos/PagoTarjeta.js";
import { PagoPSE } from "../pagos/PagoPSE.js";
import { PagoNequi } from "../pagos/PagoNequi.js";
import { ServicioDivisas } from "../servicios/ServicioDivisas.js";
import { ServicioEnvio } from "../servicios/ServicioEnvio.js";
/**
* Controlador de la interfaz: lee el DOM, delega en el modelo y los
* servicios y muestra los resultados. No contiene reglas de negocio.
*/
export class CheckoutUI {
    #catalogo; #carrito; #divisas; #clima; #envio; #repositorio;
    #cliente = null;
    #ubicacionGPS = null;
    #cotizacion = null; // { destino, km, clima }
    #moneda = "COP";
    #tasa = 1; // factor COP → moneda elegida
    #fuenteTasa = "sin conversión";
    #fechaTasa = null;
    #el = {};
    /**
    * @param {{catalogo: import("../modelo/Producto.js").Producto[], carrito: import("../modelo/Carrito.js").Carrito,
    * divisas: ServicioDivisas, clima: import("../servicios/ServicioClima.js").ServicioClima,
    * envio: ServicioEnvio, repositorio: import("../servicios/RepositorioTransacciones.js").RepositorioTransacciones}} deps
    */
    constructor({ catalogo, carrito, divisas, clima, envio, repositorio }) {
        this.#catalogo = catalogo;
        this.#carrito = carrito;
        this.#divisas = divisas;
        this.#clima = clima;
        this.#envio = envio;
        this.#repositorio = repositorio;
    }
    /** Punto de arranque: prepara el DOM y pinta el estado inicial. */
    iniciar() {
        this.#capturarElementos();
        this.#poblarListas();
        this.#enlazarEventos();
        this.#mostrarMedio(null);
        this.#renderTodo();
        this.#renderHistorial();
    }
    // =================== Casos de uso públicos ===================
    /** RF-01: registra al cliente; las validaciones viven en Usuario/Cliente. */
    registrar() {
        const e = this.#el;
        try {
            if (!e.autorizacion.checked) throw new Error("Debe autorizar el tratamiento de datos personales para continuar.");
            const destino = e.ciudad.value === "gps" ? this.#ubicacionGPS :
                ServicioEnvio.buscarCiudad(e.ciudad.value);
            this.#cliente = new Cliente(e.nombre.value, e.correo.value, destino);
            this.#cotizacion = null; // cambió el destino: hay que volver a cotizar
            this.#estado(e.estadoRegistro, `✔ Hola, ${this.#cliente.nombre}. Entrega en ${this.#cliente.destino.nombre}.`, "ok");
            this.#renderResumen();
        } catch (error) {
            this.#estado(e.estadoRegistro, error.message, "error");
        }
    }
    /** RF-04: cotiza el envío (distancia + clima). Si el clima falla, continúa. */
    async cotizar() {
        if (!this.#cliente) {
            this.#avisar("Primero guarda tus datos para saber a dónde enviar.", "error");
            return;
        }
        const destino = this.#cliente.destino;
        this.#el.btnCotizar.disabled = true;
        this.#el.infoEnvio.textContent = "Consultando el clima en el destino…";
        let clima = { llueve: false, descripcion: "sin dato", temperatura: null, fuente: "valor por defecto" };
        try {
            clima = { ...(await this.#clima.actual(destino.lat, destino.lon)), fuente: "Open-Meteo" };
        } catch (error) {
            this.#avisar(`Clima no disponible (${error.message}); se asume tiempo seco.`);
        } finally {
            this.#el.btnCotizar.disabled = false;
        }
        const km = this.#envio.distanciaKm(destino);
        this.#cotizacion = { destino, km, clima };
        this.#renderResumen();
    }
    /** RF-05: obtiene la tasa COP → moneda. Si la API falla, usa respaldo. */
    async convertir(moneda) {
        this.#moneda = moneda;
        if (moneda === "COP") {
            this.#tasa = 1; this.#fuenteTasa = "sin conversión"; this.#fechaTasa = null;
        } else {
            try {
                this.#tasa = await this.#divisas.factor("COP", moneda);
                this.#fuenteTasa = "ExchangeRate-API";
                this.#fechaTasa = this.#divisas.fechaActualizacion;
            } catch (error) {
                this.#tasa = ServicioDivisas.factorRespaldo("COP", moneda);
                this.#fuenteTasa = "valor de respaldo (ilustrativo)";
                this.#fechaTasa = null;
                this.#avisar(`No se pudo consultar la tasa de cambio (${error.message}); se usa un valor de respaldo.`);
            }
        }
        this.#renderTodo();
    }
    /** RF-06 y RF-07: crea la Transaccion y la paga con el medio elegido. */
    pagar() {
        const e = this.#el;
        let transaccion = null;
        try {
            const envio = this.#datosEnvio();
            transaccion = Transaccion.crear({
                cliente: this.#cliente, carrito: this.#carrito, envio,
                moneda: this.#moneda, tasa: this.#tasa, fechaTasa: this.#fechaTasa
            });
            transaccion.pagar(this.#crearMedio()); // polimorfismo: cualquier MedioPago sirve
            this.#repositorio.guardar(transaccion); // RF-08
            this.#carrito.vaciar();
            this.#limpiarDatosPago();
            for (const r of e.formPago.elements.medio) r.checked = false;
            this.#mostrarMedio(null);
            this.#estado(e.estadoPago, `✔ Pago aprobado. Ganaste puntos: ahora tienes ${this.#cliente.puntos} puntos Coquito.`, "ok");
            this.#mostrarRecibo(transaccion);
            this.#renderTodo();
            this.#renderHistorial();
        } catch (error) {
            if (transaccion?.estado === Transaccion.ESTADOS.RECHAZADA) {
                this.#repositorio.guardar(transaccion);
                this.#renderHistorial();
            }
            this.#estado(e.estadoPago, error.message, "error");
        }
    }
    // =================== Preparación del DOM ===================
    #capturarElementos() {
        const $ = (id) => document.getElementById(id);
        const ids = ["avisos", "moneda", "contador-carrito", "form-registro", "nombre", "correo", "ciudad",
            "btn-ubicacion", "autorizacion", "estado-registro", "catalogo", "carrito-lista", "carrito-vacio",
            "carrito-subtotal", "btn-cotizar", "info-envio", "res-subtotal", "res-envio", "res-comision", "res-total",
            "res-total-moneda", "res-tasa", "form-pago", "datos-tarjeta", "datos-pse", "datos-nequi", "tarjeta-numero",
            "tarjeta-titular", "tarjeta-vencimiento", "tarjeta-cvv", "pse-banco", "pse-tipo", "pse-documento",
            "nequi-celular", "estado-pago", "recibo", "recibo-contenido", "btn-cerrar-recibo", "historial-lista",
            "btn-borrar-historial", "com-tarjeta", "com-pse", "com-nequi"];
        for (const id of ids) {
            const clave = id.replace(/-([a-z])/g, (_, l) => l.toUpperCase()); // "btn-cotizar" → "btnCotizar"
            this.#el[clave] = $(id);
        }
    }
    #poblarListas() {
        const e = this.#el;
        ServicioEnvio.CIUDADES.forEach((c) => e.ciudad.add(new Option(c.nombre, c.nombre)));
        PagoPSE.BANCOS.forEach((b) => e.pseBanco.add(new Option(b, b)));
        e.comTarjeta.textContent = `(${PagoTarjeta.descripcionComision})`;
        e.comPse.textContent = `(${PagoPSE.descripcionComision})`;
        e.comNequi.textContent = `(${PagoNequi.descripcionComision})`;
    }
    #enlazarEventos() {
        const e = this.#el;
        e.formRegistro.addEventListener("submit", (ev) => { ev.preventDefault(); this.registrar(); });
        e.btnUbicacion.addEventListener("click", () => this.#usarUbicacion());
        e.moneda.addEventListener("change", () => this.convertir(e.moneda.value));
        e.btnCotizar.addEventListener("click", () => this.cotizar());
        e.formPago.addEventListener("submit", (ev) => { ev.preventDefault(); this.pagar(); });
        e.formPago.addEventListener("change", (ev) => {
            if (ev.target.name === "medio")
                this.#mostrarMedio(ev.target.value);
        });
        e.tarjetaNumero.addEventListener("input", (ev) => this.#onInputNumeroTarjeta(ev));
        e.tarjetaVencimiento.addEventListener("input", (ev) => this.#onInputVencimiento(ev));
        e.tarjetaCvv.addEventListener("input", (ev) => this.#onInputCvv(ev));
        e.btnCerrarRecibo.addEventListener("click", () => { e.recibo.hidden = true; });
        e.btnBorrarHistorial.addEventListener("click", () => {
            this.#repositorio.limpiar();
            this.#renderHistorial();
        });
        // Delegación de eventos: un solo listener para todos los botones del catálogo/carrito/historial
        e.catalogo.addEventListener("click", (ev) => {
            const boton = ev.target.closest("button[data-accion='agregar']");
            if (boton) this.#agregar(boton.dataset.sku);
        });
        e.carritoLista.addEventListener("click", (ev) => {
            const boton = ev.target.closest("button[data-accion]");
            if (boton) this.#accionCarrito(boton.dataset.accion, boton.dataset.sku);
        });
        e.carritoLista.addEventListener("change", (ev) => {
            if (ev.target.dataset.accion === "cantidad") this.#accionCarrito("cantidad", ev.target.dataset.sku,
                Number(ev.target.value));
        });
        e.historialLista.addEventListener("click", (ev) => {
            const boton = ev.target.closest("button[data-id]");
            if (boton) { const t = this.#repositorio.buscar(boton.dataset.id); if (t) this.#mostrarRecibo(t); }
        });
    }
    // =================== Acciones internas ===================
    async #usarUbicacion() {
        try {
            this.#ubicacionGPS = await this.#envio.ubicacionNavegador();
            let opcion = this.#el.ciudad.querySelector("option[value='gps']");
            if (!opcion) { opcion = new Option("📍 Mi ubicación actual", "gps"); this.#el.ciudad.add(opcion, 1); }
            this.#el.ciudad.value = "gps";
            this.#avisar("Ubicación obtenida. Guarda tus datos para usarla en el envío.", "ok");
        } catch (error) {
            this.#avisar(`${error.message} Elige tu ciudad en la lista.`, "error");
        }
    }
    #agregar(sku) {
        const producto = this.#catalogo.find((p) => p.sku === sku);
        const cantidad = Number(document.getElementById(`cant-${sku}`).value);
        try {
            this.#carrito.agregar(producto, cantidad);
            this.#avisar(`Agregaste ${cantidad} × ${producto.nombre}.`, "ok");
            this.#renderTodo();
        } catch (error) {
            this.#avisar(error.message, "error");
        }
    }
    #accionCarrito(accion, sku, valor) {
        try {
            const item = this.#carrito.items.find((i) => i.producto.sku === sku);
            if (accion === "sumar") this.#carrito.agregar(item.producto, 1);
            if (accion === "restar") this.#carrito.quitar(sku, 1);
            if (accion === "eliminar") this.#carrito.eliminar(sku);
            if (accion === "cantidad") this.#carrito.cambiarCantidad(sku, valor);
        } catch (error) {
            this.#avisar(error.message, "error");
        }
        this.#renderTodo();
    }
    /** Construye el medio de pago elegido con los datos del formulario. */
    #crearMedio() {
        const e = this.#el;
        const tipo = e.formPago.elements.medio.value;
        if (!tipo) throw new Error("Seleccione un medio de pago.");
        const fabricas = {
            tarjeta: () => new PagoTarjeta({
                numero: e.tarjetaNumero.value, titular: e.tarjetaTitular.value,
                vencimiento: e.tarjetaVencimiento.value, cvv: e.tarjetaCvv.value
            }),
            pse: () => new PagoPSE({
                banco: e.pseBanco.value, tipoPersona: e.pseTipo.value,
                documento: e.pseDocumento.value
            }),
            nequi: () => new PagoNequi({ celular: e.nequiCelular.value })
        };
        if (!fabricas[tipo]) throw new Error("Seleccione un medio de pago.");
        return fabricas[tipo]();
    }
    #datosEnvio() {
        if (!this.#cotizacion) return null;
        const { destino, km, clima } = this.#cotizacion;
        return {
            destino: destino.nombre,
            km: Math.round(km),
            llueve: clima.llueve,
            clima: clima.descripcion,
            temperatura: clima.temperatura,
            fuenteClima: clima.fuente,
            costo: this.#envio.costo(km, clima.llueve, this.#carrito.subtotal)
        };
    }
    #limpiarDatosPago() {
        const e = this.#el;
        [e.tarjetaNumero, e.tarjetaTitular, e.tarjetaVencimiento, e.tarjetaCvv, e.pseDocumento, e.nequiCelular]
            .forEach((input) => { input.value = ""; });
    }
    #mostrarMedio(tipo) {
        this.#el.datosTarjeta.hidden = tipo !== "tarjeta";
        this.#el.datosPse.hidden = tipo !== "pse";
        this.#el.datosNequi.hidden = tipo !== "nequi";
        if (tipo === "tarjeta") this.#el.tarjetaNumero?.focus();
        else if (tipo === "pse") this.#el.pseBanco?.focus();
        else if (tipo === "nequi") this.#el.nequiCelular?.focus();
    }
    // =================== Renderizado ===================
    #renderTodo() {
        this.#renderCatalogo();
        this.#renderCarrito();
        this.#renderResumen();
    }
    #renderCatalogo() {
        this.#el.catalogo.innerHTML = this.#catalogo.map((p) => `
  <article class="producto">
  <span class="producto__emoji" aria-hidden="true">${p.emoji}</span>
  <h3>${this.#esc(p.nombre)}</h3>
  <p class="producto__precio">${this.#cop(p.precio)}${this.#equivalente(p.precio)}</p>
  <p class="producto__stock">Disponibles: ${p.stock}</p>
  <div class="producto__compra">
  <div class="campo">
  <label for="cant-${p.sku}">Cantidad</label>
  <input type="number" id="cant-${p.sku}" min="1" max="${p.stock}" value="1" ${p.stock === 0 ? "disabled" : ""}>
  </div>
  <button type="button" class="btn" data-accion="agregar" data-sku="${p.sku}" ${p.stock === 0 ? "disabled" : ""}>
  ${p.stock === 0 ? "Agotado" : "Agregar"}</button>
  </div>
  </article>`).join("");
    }
    #renderCarrito() {
        const e = this.#el;
        const items = this.#carrito.items;
        e.carritoVacio.hidden = items.length > 0;
        e.contadorCarrito.textContent = this.#carrito.cantidadTotal;
        e.carritoSubtotal.textContent = this.#cop(this.#carrito.subtotal);
        e.carritoLista.innerHTML = items.map((i) => `
  <li>
  <span>${i.producto.emoji} <strong>${this.#esc(i.producto.nombre)}</strong><br>
  <small>${this.#cop(i.producto.precio)} c/u · ${this.#cop(i.subtotal)}</small></span>
  <span class="carrito__controles">
  <button type="button" class="btn btn--secundario btn--mini" data-accion="restar" data-sku="${i.producto.sku}" aria-label="Quitar una unidad de ${this.#esc(i.producto.nombre)}">−</button>
  <input type="number" min="0" max="${i.producto.stock}" value="${i.cantidad}" data-accion="cantidad" data-sku="${i.producto.sku}" aria-label="Cantidad de ${this.#esc(i.producto.nombre)}">
  <button type="button" class="btn btn--secundario btn--mini" data-accion="sumar" data-sku="${i.producto.sku}" aria-label="Agregar una unidad de ${this.#esc(i.producto.nombre)}">+</button>
  <button type="button" class="btn btn--mini" data-accion="eliminar" data-sku="${i.producto.sku}" aria-label="Eliminar ${this.#esc(i.producto.nombre)}">✕</button>
  </span>
  </li>`).join("");
    }
    #renderResumen() {
        const e = this.#el;
        const subtotal = this.#carrito.subtotal;
        const envio = this.#datosEnvio();
        const totalCOP = subtotal + (envio?.costo ?? 0);
        e.resSubtotal.textContent = this.#cop(subtotal);
        e.resEnvio.textContent = envio ? (envio.costo === 0 ? "Gratis" : this.#cop(envio.costo)) : "Sin cotizar";
        e.resTotal.textContent = this.#cop(totalCOP);
        e.resTotalMoneda.textContent = this.#moneda === "COP" ? "—" : this.#formato(totalCOP * this.#tasa, this.#moneda);
        e.resComision.textContent = "Se suma al pagar según el medio";
        e.infoEnvio.textContent = envio
            ? `${envio.destino}: ${envio.km} km desde la bodega de Medellín · Clima: ${envio.clima}` +
            `${envio.temperatura !== null ? ` (${envio.temperatura} °C)` : ""}${envio.llueve ? " · recargo por lluvia" : ""} · fuente: ${envio.fuenteClima}`
            : "";
        e.resTasa.textContent = this.#moneda === "COP" ? "" :
            `Tasa usada: 1 COP = ${this.#tasa.toFixed(6)} ${this.#moneda} · Fuente: ${this.#fuenteTasa}` +
            `${this.#fechaTasa ? ` · Actualizada: ${this.#fechaTasa}` : ""}`;
    }
    #mostrarRecibo(t) {
        const e = this.#el;
        const filas = t.items.map((i) =>
            `<tr><td>${this.#esc(i.nombre)}</td><td>${i.cantidad}</td><td>${this.#cop(i.subtotal)}</td></tr>`).join("");
        e.reciboContenido.innerHTML = `
  <p><strong>Transacción:</strong> ${t.id} <span class="etiqueta etiqueta--${t.estado}">${t.estado}</span></p>
  <p><strong>Fecha:</strong> ${new Date(t.fecha).toLocaleString("es-CO")}</p>
  <p><strong>Cliente:</strong> ${this.#esc(t.cliente.nombre)} · ${this.#esc(t.cliente.correo)} · ${this.#esc(t.envio.destino)}</p>
  <table><thead><tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr></thead><tbody>${filas}</tbody></table>
  <dl class="resumen">
  <dt>Productos</dt><dd>${this.#cop(t.subtotal)}</dd>
  <dt>Envío (${t.envio.km} km${t.envio.llueve ? ", lluvia" : ""})</dt><dd>${t.costoEnvio === 0 ? "Gratis" : this.#cop(t.costoEnvio)}</dd>
  <dt>Comisión ${t.pago ? this.#esc(t.pago.medio) : ""}</dt><dd>${this.#cop(t.comision)}</dd>
  <dt class="resumen__total">Total COP</dt><dd class="resumen__total">${this.#cop(t.total)}</dd>
  ${t.moneda !== "COP" ? `<dt>Total ${t.moneda}</dt><dd>${this.#formato(t.totalMoneda, t.moneda)}</dd>` : ""}
  </dl>
  <p><strong>Medio de pago:</strong> ${t.pago ? this.#esc(t.pago.detalle) : "—"}</p>
  <p class="nota">Moneda: ${t.moneda} · Tasa registrada: ${t.moneda === "COP" ? "1" :
                t.tasa.toFixed(6)}${t.fechaTasa ? ` (${t.fechaTasa})` : ""}</p>`;
        e.recibo.hidden = false;
        e.recibo.focus();
    }
    #renderHistorial() {
        const lista = this.#repositorio.listar();
        this.#el.historialLista.innerHTML = lista.length === 0 ? "<li>Aún no hay compras.</li>" : lista.map((t) =>
            `
  <li>
  <span><strong>${t.id}</strong> · ${new Date(t.fecha).toLocaleString("es-CO")}
  <span class="etiqueta etiqueta--${t.estado}">${t.estado}</span></span>
  <span>${this.#cop(t.total)}${t.moneda !== "COP" ? ` · ${this.#formato(t.totalMoneda, t.moneda)}` : ""}
  <button type="button" class="btn btn--secundario btn--mini" data-id="${t.id}">Ver recibo</button></span>
  </li>`).join("");
    }
    // =================== Utilidades de presentación ===================
    #formato(valor, moneda) {
        return new Intl.NumberFormat("es-CO", {
            style: "currency", currency: moneda, maximumFractionDigits: moneda === "COP" ? 0 : 2
        }).format(valor);
    }
    #cop(valor) { return this.#formato(valor, "COP"); }
    #equivalente(valorCOP) {
        return this.#moneda === "COP" ? "" : `<small>≈ ${this.#formato(valorCOP * this.#tasa, this.#moneda)}</small>`;
    }
    #esc(texto) {
        return String(texto).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
            "'": "&#39;"
        }[c]));
    }
    #estado(elemento, mensaje, tipo) {
        elemento.textContent = mensaje;
        elemento.className = `estado estado--${tipo}`;
    }
    /** Muestra un aviso temporal (degradación elegante cuando falla una API). */
    #avisar(mensaje, tipo = "info") {
        const aviso = document.createElement("p");
        aviso.className = `aviso aviso--${tipo}`;
        aviso.textContent = mensaje;
        this.#el.avisos.append(aviso);
        setTimeout(() => aviso.remove(), 6000);
    }
    // =================== Formateo de tarjeta ===================
    #onInputNumeroTarjeta(ev) {
        const input = ev.target;
        const cursor = input.selectionStart;
        const anterior = input.value;
        const digitosAntes = anterior.slice(0, cursor).replace(/\D/g, "").length;
        const nuevo = this.#formatearNumeroTarjeta(anterior);
        input.value = nuevo;

        let pos = 0;
        let conteo = 0;
        while (pos < nuevo.length && conteo < digitosAntes) {
            if (/\d/.test(nuevo[pos])) conteo++;
            pos++;
        }
        input.setSelectionRange(pos, pos);
    }
    #formatearNumeroTarjeta(valor) {
        const digitos = String(valor ?? "").replace(/\D/g, "");
        if (/^3[47]/.test(digitos)) {
            const d = digitos.slice(0, 15);
            const partes = [];
            if (d.length > 0) partes.push(d.slice(0, 4));
            if (d.length > 4) partes.push(d.slice(4, 10));
            if (d.length > 10) partes.push(d.slice(10, 15));
            return partes.join(" ");
        }
        const d = digitos.slice(0, 16);
        const grupos = d.match(/.{1,4}/g);
        return grupos ? grupos.join(" ") : "";
    }
    #onInputVencimiento(ev) {
        const input = ev.target;
        const cursor = input.selectionStart;
        const anterior = input.value;
        const digitosAntes = anterior.slice(0, cursor).replace(/\D/g, "").length;
        const nuevo = this.#formatearVencimiento(anterior);
        input.value = nuevo;

        let pos = 0;
        let conteo = 0;
        while (pos < nuevo.length && conteo < digitosAntes) {
            if (/\d/.test(nuevo[pos])) conteo++;
            pos++;
        }
        if (nuevo[pos] === "/" && conteo === digitosAntes && cursor >= 2) {
            pos++;
        }
        input.setSelectionRange(pos, pos);
    }
    #formatearVencimiento(valor) {
        const digitos = String(valor ?? "").replace(/\D/g, "").slice(0, 4);
        if (digitos.length > 2) {
            return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
        }
        if (String(valor ?? "").endsWith("/") && digitos.length === 2) {
            return `${digitos}/`;
        }
        return digitos;
    }
    #onInputCvv(ev) {
        ev.target.value = ev.target.value.replace(/\D/g, "").slice(0, 4);
    }
}
