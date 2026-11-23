/**
* Clase base de los servicios que consumen APIs externas.
* Centraliza fetch + tiempo límite + verificación de la respuesta HTTP.
*/
export class ServicioHTTP {
    #tiempoLimiteMs;
    constructor(tiempoLimiteMs = 8000) {
        if (new.target === ServicioHTTP) throw new TypeError("ServicioHTTP es abstracta.");
        this.#tiempoLimiteMs = tiempoLimiteMs;
    }
    /**
    * Hace la petición GET y devuelve el JSON. Lanza Error si falla la red,
    * se agota el tiempo o el servidor responde con un código de error.
    * @param {string|URL} url
    */
    async obtenerJSON(url) {
        const control = new AbortController();
        const temporizador = setTimeout(() => control.abort(), this.#tiempoLimiteMs);
        try {
            const resp = await fetch(url, { signal: control.signal });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.json();
        } catch (error) {
            if (error.name === "AbortError") throw new Error("tiempo de espera agotado");
            throw error;
        } finally {
            clearTimeout(temporizador);
        }
    }
}