/**
* Usuario «abstracta»: identidad y datos de contacto validados.
* No se puede instanciar directamente; se usa a través de subclases (Cliente).
* Pilares: abstracción (new.target) y encapsulamiento (campos #).
*/
export class Usuario {
    static #secuencia = 0;
    #id;
    #nombre;
    #correo;
    /**
    * @param {string} nombre Nombre completo (mínimo 3 letras).
    * @param {string} correo Correo electrónico válido.
    */
    constructor(nombre, correo) {
        if (new.target === Usuario) {
            throw new TypeError("Usuario es abstracta: use una subclase como Cliente");
        }
        this.#nombre = Usuario.#validarNombre(nombre);
        this.#correo = Usuario.#validarCorreo(correo);
        this.#id = `U-${String(++Usuario.#secuencia).padStart(4, "0")}`;
    }
    get id() { return this.#id; }
    get nombre() { return this.#nombre; }
    get correo() { return this.#correo; }
    /** Método abstracto: cada subclase decide cómo describirse. */
    describir() {
        throw new Error(`${this.constructor.name} debe implementar describir()`);
    }
    static #validarNombre(nombre) {
        const limpio = String(nombre ?? "").trim().replace(/\s+/g, " ");
        if (limpio.length < 3 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]+$/.test(limpio)) {
            throw new Error("El nombre debe tener al menos 3 letras y solo puede contener letras y espacios.");
        }
        return limpio;
    }
    static #validarCorreo(correo) {
        const limpio = String(correo ?? "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio)) {
            throw new Error("El correo no es válido (ejemplo: nombre@correo.com).");
        }
        return limpio;
    }
}