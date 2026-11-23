import { Usuario } from "./Usuario.js";
/**
* Cliente de la tienda. Hereda identidad y contacto de Usuario («es un»)
* y agrega el destino de entrega y los puntos de fidelización.
*/
export class Cliente extends Usuario {
    #destino;
    #puntos = 0;
    /**
    * @param {string} nombre
    * @param {string} correo
    * @param {{nombre: string, lat: number, lon: number}} destino Ciudad o ubicación de entrega.
    */
    constructor(nombre, correo, destino) {
        super(nombre, correo); // obligatorio antes de usar this
        this.destino = destino; // pasa por el setter → se valida
    }
    /** Devuelve una copia para que nadie modifique el destino desde fuera. */
    get destino() { return { ...this.#destino }; }
    set destino(destino) {
        const { nombre, lat, lon } = destino ?? {};
        if (!nombre || typeof nombre !== "string") throw new Error("Debe indicar la ciudad o ubicación de entrega.");
        if (!Number.isFinite(lat) || lat < - 90 || lat > 90) throw new RangeError("Latitud de destino inválida.");
        if (!Number.isFinite(lon) || lon < - 180 || lon > 180) throw new RangeError("Longitud de destino inválida.");
        this.#destino = Object.freeze({ nombre, lat, lon });
    }
    get puntos() { return this.#puntos; }
    /** Regla de fidelización: 1 punto Coquito por cada $10.000 COP comprados. */
    acumular(valorCompra) {
        if (!Number.isFinite(valorCompra) || valorCompra <= 0) return this.#puntos;
        this.#puntos += Math.floor(valorCompra / 10000);
        return this.#puntos;
    }
    /** Sobrescribe el método abstracto del padre (polimorfismo). */
    describir() {
        return `${this.nombre} <${this.correo}> · entrega en ${this.#destino.nombre}`;
    }
    /** Datos públicos del cliente para guardar en la transacción. */
    toJSON() {
        return { id: this.id, nombre: this.nombre, correo: this.correo, destino: this.destino };
    }
}