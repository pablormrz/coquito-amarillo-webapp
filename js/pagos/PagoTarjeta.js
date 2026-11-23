import { MedioPago } from "./MedioPago.js";
/**
* Pago con tarjeta crédito/débito (simulado).
* El número completo y el CVV solo viven en memoria hasta procesar el pago;
* nunca se guardan ni se envían (Ley 1581 de 2012).
*/
export class PagoTarjeta extends MedioPago {
    static #TASA = 0.029; // 2,9 % ilustrativo
    static descripcionComision = "2,9 % del valor";
    #numero;
    #cvv;
    #titular;
    #vencimiento;
    #ultimos4;
    #marca;
    constructor({ numero, titular, vencimiento, cvv } = {}) {
        super();
        this.#numero = String(numero ?? "").replace(/[\s-]/g, "");
        this.#cvv = String(cvv ?? "").trim();
        this.#titular = String(titular ?? "").trim();
        this.#vencimiento = String(vencimiento ?? "").trim();
        this.#ultimos4 = this.#numero.slice(-4);
        this.#marca = PagoTarjeta.#franquicia(this.#numero);
    }
    get nombre() { return "Tarjeta"; }
    get descripcionSegura() { return `${this.#marca} •••• ${this.#ultimos4}`; }
    validar() {
        if (!/^\d{13,19}$/.test(this.#numero ?? "") || !PagoTarjeta.#luhn(this.#numero)) {
            throw new Error("Número de tarjeta inválido.");
        }
        if (this.#titular.length < 3) throw new Error("Escriba el nombre del titular como aparece en la tarjeta.");
        if (!this.#vigente()) throw new Error("La fecha de vencimiento no es válida o la tarjeta está vencida (formato MM / AA).");
        if (!/^\d{3,4}$/.test(this.#cvv ?? "")) throw new Error("El CVV debe tener 3 o 4 dígitos.");
        return true;
    }
    calcularComision(monto) { return Math.round(monto * PagoTarjeta.#TASA); }
    /** Reutiliza la plantilla del padre y luego borra los datos sensibles. */
    procesar(monto) {
        const resultado = super.procesar(monto);
        this.#numero = null;
        this.#cvv = null;
        return resultado;
    }
    #vigente() {
        const coincide = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(this.#vencimiento);
        if (!coincide) return false;
        const mes = Number(coincide[1]);
        const anio = 2000 + Number(coincide[2]);
        const hoy = new Date();
        return anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes >= hoy.getMonth() + 1);
    }
    /** Identifica la franquicia por los primeros dígitos. */
    static #franquicia(n) {
        if (/^4/.test(n)) return "Visa";
        if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
        if (/^3[47]/.test(n)) return "Amex";
        return "Tarjeta";
    }
    /** Algoritmo de Luhn: detecta números de tarjeta mal digitados. */
    static #luhn(numero) {
        let suma = 0;
        let doblar = false;
        for (let i = numero.length - 1; i >= 0; i--) {
            let d = Number(numero[i]);
            if (doblar) { d *= 2; if (d > 9) d -= 9; }
            suma += d;
            doblar = !doblar;
        }
        return suma % 10 === 0;
    }
}