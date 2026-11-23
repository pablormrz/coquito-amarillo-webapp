import { MedioPago } from "./MedioPago.js";
/** Pago por PSE (débito a cuenta bancaria, simulado). */
export class PagoPSE extends MedioPago {
    static BANCOS = Object.freeze(["Bancolombia", "Banco de Bogotá", "Davivienda", "BBVA", "Banco de Occidente", "Banco Popular"]);
    static descripcionComision = "$1.500 fija";
    #banco;
    #tipoPersona;
    #documento;
    constructor({ banco, tipoPersona, documento } = {}) {
        super();
        this.#banco = String(banco ?? "");
        this.#tipoPersona = String(tipoPersona ?? "");
        this.#documento = String(documento ?? "").trim();
    }
    get nombre() { return "PSE"; }
    get descripcionSegura() { return `PSE · ${this.#banco} · doc. ***${this.#documento.slice(-3)}`; }
    validar() {
        if (!PagoPSE.BANCOS.includes(this.#banco)) throw new Error("Seleccione un banco de la lista.");
        if (!["natural", "juridica"].includes(this.#tipoPersona)) throw new Error("Seleccione el tipo de persona.");
        if (!/^\d{6,10}$/.test(this.#documento)) throw new Error("El documento debe tener entre 6 y 10 dígitos.");
        return true;
    }
    calcularComision() { return 1500; } // tarifa fija ilustrativa
}