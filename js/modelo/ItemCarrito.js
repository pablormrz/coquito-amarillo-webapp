import { Producto } from "./Producto.js";
/**
* Línea del carrito: un producto y la cantidad pedida.
* La cantidad nunca puede superar el stock del producto.
*/
export class ItemCarrito {
    #producto;
    #cantidad;
    constructor(producto, cantidad = 1) {
        if (!(producto instanceof Producto)) throw new TypeError("El ítem necesita un Producto.");
        this.#producto = producto;
        this.cantidad = cantidad; // setter con validación
    }
    get producto() { return this.#producto; }
    get cantidad() { return this.#cantidad; }
    set cantidad(cantidad) {
        if (!Number.isInteger(cantidad) || cantidad < 1) {
            throw new RangeError("La cantidad debe ser un número entero mayor o igual a 1.");
        }
        if (!this.#producto.hayDisponible(cantidad)) {
            throw new RangeError(`Solo hay ${this.#producto.stock} unidades de ${this.#producto.nombre}.`);
        }
        this.#cantidad = cantidad;
    }
    get subtotal() { return this.#producto.precio * this.#cantidad; }
    /** Copia de solo datos (el precio queda “congelado” en la transacción). */
    toJSON() {
        return {
            sku: this.#producto.sku,
            nombre: this.#producto.nombre,
            precio: this.#producto.precio,
            cantidad: this.#cantidad,
            subtotal: this.subtotal
        };
    }
}