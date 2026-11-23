/**
* Producto del catálogo. Precio y stock son privados y solo cambian
* a través de operaciones que cumplen las reglas del negocio.
*/
export class Producto {
    #sku;
    #nombre;
    #precio;
    #stock;
    #categoria;
    #emoji;
    /**
    * @param {string} sku Código único del producto.
    * @param {string} nombre
    * @param {number} precio Precio en COP (> 0).
    * @param {number} stock Unidades disponibles (entero ≥ 0).
    * @param {string} [categoria]
    * @param {string} [emoji] Ícono que se muestra en el catálogo.
    */
    constructor(sku, nombre, precio, stock, categoria = "General", emoji = " ") {
        if (!sku || typeof sku !== "string") throw new TypeError("El SKU es obligatorio.");
        if (!nombre || String(nombre).trim().length < 3) throw new TypeError("Nombre de producto inválido.");
        if (!Number.isInteger(stock) || stock < 0) throw new RangeError("El stock debe ser un entero mayor o igual a 0.");
        this.#sku = sku;
        this.#nombre = String(nombre).trim();
        this.precio = precio; // setter con validación
        this.#stock = stock;
        this.#categoria = categoria;
        this.#emoji = emoji;
    }
    get sku() { return this.#sku; }
    get nombre() { return this.#nombre; }
    get categoria() { return this.#categoria; }
    get emoji() { return this.#emoji; }
    get stock() { return this.#stock; }
    get precio() { return this.#precio; }
    set precio(valor) {
        if (!Number.isFinite(valor) || valor <= 0) {
            throw new RangeError("El precio debe ser un número positivo.");
        }
        this.#precio = Math.round(valor);
    }
    /** ¿Hay unidades suficientes para la cantidad pedida? */
    hayDisponible(cantidad = 1) {
        return Number.isInteger(cantidad) && cantidad > 0 && cantidad <= this.#stock;
    }
    /** Descuenta unidades del inventario. Lanza error si no alcanza. */
    reservar(cantidad) {
        if (!this.hayDisponible(cantidad)) {
            throw new Error(`Stock insuficiente de ${this.#nombre} (disponibles: ${this.#stock}).`);
        }
        this.#stock -= cantidad;
        return this.#stock;
    }
    /** Fábrica: crea un Producto a partir de un objeto leído del JSON. */
    static desdeJSON(obj) {
        return new Producto(obj.sku, obj.nombre, obj.precio, obj.stock, obj.categoria, obj.emoji);
    }
}