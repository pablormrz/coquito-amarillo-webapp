/**
* MedioPago «abstracta»: contrato común para todos los medios de pago.
* Aplica el patrón Método Plantilla: procesar() fija el algoritmo y
* cada subclase completa validar(), calcularComision() y descripcionSegura.
*/
export class MedioPago {
    constructor() {
        if (new.target === MedioPago) {
            throw new TypeError("MedioPago es abstracta: use PagoTarjeta, PagoPSE o PagoNequi.");
        }
    }
    /** Nombre visible del medio. @abstract */
    get nombre() { throw new Error(`${this.constructor.name} debe implementar nombre`); }
    /** Texto seguro para el recibo (nunca datos completos). @abstract */
    get descripcionSegura() { throw new Error(`${this.constructor.name} debe implementar descripcionSegura`); }
    /** Valida los datos propios del medio; lanza Error si algo falla. @abstract */
    validar() { throw new Error(`${this.constructor.name} debe implementar validar()`); }
    /** Comisión en COP para un monto dado. @abstract */
    calcularComision(monto) { throw new Error(`${this.constructor.name} debe implementar calcularComision()`); }
    /**
    * Método plantilla: igual para todos los medios.
    * @param {number} monto Valor en COP a cobrar (productos + envío).
    */
    procesar(monto) {
        if (!Number.isFinite(monto) || monto <= 0) throw new RangeError("El monto a pagar no es válido.");
        this.validar();
        const comision = this.calcularComision(monto);
        return Object.freeze({
            medio: this.nombre,
            detalle: this.descripcionSegura,
            monto,
            comision,
            total: monto + comision
        });
    }
}