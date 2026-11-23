import { ServicioHTTP } from "./ServicioHTTP.js";
/**
* API 2 · Open-Meteo (sin clave, uso no comercial, CC BY 4.0).
* Consulta el clima actual en el destino para el recargo logístico por lluvia.
*/
export class ServicioClima extends ServicioHTTP {
    static #URL = "https://api.open-meteo.com/v1/forecast";
    #cache = new Map(); // "lat,lon" → resultado
    /**
    * @param {number} lat
    * @param {number} lon
    * @returns {Promise<{temperatura:number, codigo:number, llueve:boolean, descripcion:string}>}
    */
    async actual(lat, lon) {
        const clave = `${lat.toFixed(2)},${lon.toFixed(2)}`;
        if (this.#cache.has(clave)) return this.#cache.get(clave);
        const url = new URL(ServicioClima.#URL);
        url.search = new URLSearchParams({
            latitude: lat, longitude: lon, current:
                "temperature_2m,weather_code"
        });
        const { current } = await this.obtenerJSON(url);
        if (!current) throw new Error("Respuesta inválida de la API de clima");
        const resultado = Object.freeze({
            temperatura: current.temperature_2m,
            codigo: current.weather_code,
            llueve: current.weather_code >= 51, // códigos WMO de precipitación
            descripcion: ServicioClima.#describir(current.weather_code)
        });
        this.#cache.set(clave, resultado);
        return resultado;
    }
    static #describir(codigo) {
        if (codigo === 0) return "Despejado";
        if (codigo <= 3) return "Parcialmente nublado";
        if (codigo <= 48) return "Niebla";
        if (codigo <= 67) return "Lluvia";
        if (codigo <= 77) return "Nieve";
        if (codigo <= 82) return "Aguaceros";
        return "Tormenta";
    }
}