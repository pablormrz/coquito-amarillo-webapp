import { MedioPago } from "./MedioPago.js";
/** Pago con Nequi (simulado). */
export class PagoNequi extends MedioPago {
    static descripcionComision = "Sin costo";
    #celular;
    constructor({ celular } = {}) {
        super();
        this.#celular = String(celular ?? "").replace(/\s/g, "");
    }
    get nombre() { return "Nequi"; }
    get descripcionSegura() { return `Nequi · 3** *** ${this.#celular.slice(-4)}`; }
    validar() {
        if (!/^3\d{9}$/.test(this.#celular)) {
            throw new Error("El celular Nequi debe tener 10 dígitos y empezar por 3.");
        }
        return true;
    }
    calcularComision() { return 0; }
}