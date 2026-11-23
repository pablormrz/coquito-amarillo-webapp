import { ServicioHTTP } from "./ServicioHTTP.js";
/**
* API 1 · ExchangeRate-API (acceso abierto, requiere atribución visible).
* Convierte valores entre COP, USD y EUR. Guarda las tasas en caché.
*/
export class ServicioDivisas extends ServicioHTTP {
    static #URL = "https://open.er-api.com/v6/latest/USD";
    /** Tasas de respaldo ILUSTRATIVAS (base USD) si la API no responde. */
    static #RESPALDO = Object.freeze({ USD: 1, COP: 4000, EUR: 0.92 });
    static MONEDAS = Object.freeze(["COP", "USD", "EUR"]);
    #cache = null; // { rates, fecha }
    async #tasas() {
        if (this.#cache) return this.#cache;
        const data = await this.obtenerJSON(ServicioDivisas.#URL);
        if (data.result !== "success" || !data.rates) throw new Error("Respuesta inválida de la API de divisas");
        this.#cache = { rates: data.rates, fecha: data.time_last_update_utc };
        return this.#cache;
    }
    /** Fecha de la última actualización publicada por la API (o null). */
    get fechaActualizacion() { return this.#cache?.fecha ?? null; }
    /**
    * Factor para pasar de una moneda a otra: valorDestino = valorOrigen × factor.
    * @param {string} de Código ISO 4217 de origen (p. ej., "COP").
    * @param {string} a Código ISO 4217 de destino (p. ej., "USD").
    */
    async factor(de = "COP", a = "USD") {
        if (de === a) return 1;
        const { rates } = await this.#tasas();
        if (!rates[de] || !rates[a]) throw new Error(`Moneda no soportada: ${de}/${a}`);
        return rates[a] / rates[de]; // las tasas tienen base USD
    }
    /** Convierte un valor entre monedas. */
    async convertir(valor, de = "COP", a = "USD") {
        return valor * (await this.factor(de, a));
    }
    /** Factor de respaldo cuando la API falla (la compra puede continuar). */
    static factorRespaldo(de = "COP", a = "USD") {
        const r = ServicioDivisas.#RESPALDO;
        return r[a] / r[de];
    }
}