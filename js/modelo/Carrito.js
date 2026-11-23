import { ItemCarrito } from "./ItemCarrito.js";
/**
* Carrito de compras. Se compone de ItemCarrito («tiene un»), guardados
* en un Map privado cuya clave es el SKU del producto.
*/
export class Carrito {
    #items = new Map();
    /** Agrega unidades; si el producto ya está, suma la cantidad. */
    agregar(producto, cantidad = 1) {
        const item = this.#items.get(producto.sku);
        if (item) {
            item.cantidad = item.cantidad + cantidad; // el setter valida el stock
        } else {
            this.#items.set(producto.sku, new ItemCarrito(producto, cantidad));
        }
    }
    /** Quita unidades; si llega a 0, elimina la línea. */
    quitar(sku, cantidad = 1) {
        const item = this.#obtener(sku);
        const restante = item.cantidad - cantidad;
        if (restante <= 0) this.#items.delete(sku);
        else item.cantidad = restante;
    }
    /** Fija una cantidad exacta (0 elimina la línea). */
    cambiarCantidad(sku, cantidad) {
        const item = this.#obtener(sku);
        if (cantidad === 0) this.#items.delete(sku);
        else item.cantidad = cantidad;
    }
    eliminar(sku) { this.#items.delete(sku); }
    vaciar() { this.#items.clear(); }
    get items() { return [...this.#items.values()]; }
    get estaVacio() { return this.#items.size === 0; }
    get cantidadTotal() { return this.items.reduce((suma, i) => suma + i.cantidad, 0); }
    get subtotal() { return this.items.reduce((suma, i) => suma + i.subtotal, 0); }
    cantidadDe(sku) { return this.#items.get(sku)?.cantidad ?? 0; }
    #obtener(sku) {
        const item = this.#items.get(sku);
        if (!item) throw new Error("Ese producto no está en el carrito.");
        return item;
    }
}