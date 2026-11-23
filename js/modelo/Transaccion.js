import { Cliente } from "./Cliente.js";
import { Carrito } from "./Carrito.js";
import { MedioPago } from "../pagos/MedioPago.js";
/**
* Registro inmutable de una compra: cliente, ítems, envío, moneda,
* tasa de cambio usada, medio de pago y estado.
* Se crea con Transaccion.crear() o se reconstruye con Transaccion.desdeJSON().
*/
export class Transaccion {
    static ESTADOS = Object.freeze({
        PENDIENTE: "PENDIENTE", APROBADA: "APROBADA", RECHAZADA:
            "RECHAZADA"
    });
    static #LLAVE = Symbol("construccion-interna");
    #id; #fecha; #estado;
    #cliente; #items; #envio; #pago;
    #moneda; #tasa; #fechaTasa;
    #reservas; // productos reales para descontar stock (solo transacciones nuevas)
    #clienteVivo; // instancia de Cliente para sumar puntos (solo transacciones nuevas)
    /** Use Transaccion.crear() o Transaccion.desdeJSON(); no llame al constructor directamente. */
    constructor(llave, datos) {
        if (llave !== Transaccion.#LLAVE) {
            throw new TypeError("Use Transaccion.crear() o Transaccion.desdeJSON().");
        }
        this.#id = datos.id;
        this.#fecha = datos.fecha;
        this.#estado = datos.estado;
        this.#cliente = Object.freeze({ ...datos.cliente });
        this.#items = Object.freeze(datos.items.map((i) => Object.freeze({ ...i })));
        this.#envio = Object.freeze({ ...datos.envio });
        this.#pago = datos.pago ? Object.freeze({ ...datos.pago }) : null;
        this.#moneda = datos.moneda;
        this.#tasa = datos.tasa;
        this.#fechaTasa = datos.fechaTasa ?? null;
        this.#reservas = datos.reservas ?? [];
        this.#clienteVivo = datos.clienteVivo ?? null;
    }
    /**
    * Crea una transacción PENDIENTE congelando precios, envío y tasa de cambio.
    * @param {{cliente: Cliente, carrito: Carrito, envio: object, moneda: string, tasa: number, 
   fechaTasa?: string}} p
    */
    static crear({ cliente, carrito, envio, moneda = "COP", tasa = 1, fechaTasa = null }) {
        if (!(cliente instanceof Cliente)) throw new Error("Primero registre sus datos de cliente.");
        if (!(carrito instanceof Carrito) || carrito.estaVacio) throw new Error("El carrito está vacío.");
        if (!envio || !Number.isFinite(envio.costo) || envio.costo < 0) throw new Error("Primero cotice el envío.");
        if (!["COP", "USD", "EUR"].includes(moneda)) throw new Error(`Moneda no soportada: ${moneda}`);
        if (!Number.isFinite(tasa) || tasa <= 0) throw new RangeError("Tasa de cambio inválida.");
        return new Transaccion(Transaccion.#LLAVE, {
            id: Transaccion.#nuevoId(),
            fecha: new Date().toISOString(),
            estado: Transaccion.ESTADOS.PENDIENTE,
            cliente: cliente.toJSON(),
            items: carrito.items.map((i) => i.toJSON()),
            envio,
            pago: null,
            moneda,
            tasa,
            fechaTasa,
            reservas: carrito.items.map((i) => ({ producto: i.producto, cantidad: i.cantidad })),
            clienteVivo: cliente
        });
    }
    // ----- Lectura (no hay setters: la transacción no se modifica desde fuera) -----
    get id() { return this.#id; }
    get fecha() { return this.#fecha; }
    get estado() { return this.#estado; }
    get cliente() { return this.#cliente; }
    get items() { return this.#items; }
    get envio() { return this.#envio; }
    get pago() { return this.#pago; }
    get moneda() { return this.#moneda; }
    get tasa() { return this.#tasa; }
    get fechaTasa() { return this.#fechaTasa; }
    get subtotal() { return this.#items.reduce((s, i) => s + i.subtotal, 0); }
    get costoEnvio() { return this.#envio.costo; }
    get comision() { return this.#pago?.comision ?? 0; }
    /** Total en COP: productos + envío + comisión del medio de pago. */
    get total() { return this.subtotal + this.costoEnvio + this.comision; }
    /** Total en la moneda elegida, con la tasa registrada al crear la transacción. */
    get totalMoneda() {
        return this.#moneda === "COP" ? this.total : Math.round(this.total * this.#tasa * 100) / 100;
    }
    /**
    * Paga con cualquier MedioPago (polimorfismo). Si los datos del medio son
    * inválidos lanza error y la transacción sigue PENDIENTE; si no hay stock
    * queda RECHAZADA.
    * @param {MedioPago} medio
    */
    pagar(medio) {
        if (this.#estado !== Transaccion.ESTADOS.PENDIENTE) throw new Error("Esta transacción ya fue procesada.");
        if (!(medio instanceof MedioPago)) throw new TypeError("Medio de pago inválido.");
        const resultado = medio.procesar(this.subtotal + this.costoEnvio); // valida y calcula comisión
        const faltante = this.#reservas.find(({ producto, cantidad }) => !producto.hayDisponible(cantidad));
        if (faltante) {
            this.#estado = Transaccion.ESTADOS.RECHAZADA;
            throw new Error(`Pago rechazado: ya no hay stock suficiente de ${faltante.producto.nombre}.`);
        }
        this.#reservas.forEach(({ producto, cantidad }) => producto.reservar(cantidad));
        this.#pago = Object.freeze({
            medio: resultado.medio, detalle: resultado.detalle, comision:
                resultado.comision
        });
        this.#estado = Transaccion.ESTADOS.APROBADA;
        this.#clienteVivo?.acumular(this.total);
        this.#reservas = [];
        return this;
    }
    /** Serialización para localStorage (JSON.stringify la llama automáticamente). */
    toJSON() {
        return {
            id: this.#id, fecha: this.#fecha, estado: this.#estado,
            cliente: this.#cliente, items: this.#items, envio: this.#envio, pago: this.#pago,
            moneda: this.#moneda, tasa: this.#tasa, fechaTasa: this.#fechaTasa,
            subtotal: this.subtotal, total: this.total, totalMoneda: this.totalMoneda
        };
    }
    /** Reconstruye una transacción guardada. */
    static desdeJSON(obj) {
        if (!obj || typeof obj.id !== "string" || !Array.isArray(obj.items) || !obj.envio) {
            throw new Error("Transacción guardada con formato inválido.");
        }
        return new Transaccion(Transaccion.#LLAVE, obj);
    }
    static #nuevoId() {
        const fecha = new Date().toISOString().slice(0, 10).replaceAll("-", "");
        const azar = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2) +
            Date.now().toString(16))
            .replaceAll("-", "").slice(0, 8).toUpperCase();
        return `CA-${fecha}-${azar}`;
    }
}