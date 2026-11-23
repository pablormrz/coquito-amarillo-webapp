/**
* Cálculos de envío desde la bodega de Medellín y acceso a la
* Geolocation API del navegador. Tarifas ilustrativas.
*/
export class ServicioEnvio {
    static ORIGEN = Object.freeze({ nombre: "Bodega Medellín", lat: 6.2442, lon: -75.5812 });
    static #RADIO_TIERRA_KM = 6371;
    static #ENVIO_GRATIS_DESDE = 250000;
    static #TARIFA_BASE = 8000;
    static #TARIFA_KM = 35;
    static #RECARGO_LLUVIA = 3000;
    /** Ciudades de destino disponibles (coordenadas aproximadas). */
    static CIUDADES = Object.freeze([
        { nombre: "Medellín", lat: 6.2442, lon: -75.5812 },
        { nombre: "Rionegro", lat: 6.1551, lon: -75.3737 },
        { nombre: "Bogotá", lat: 4.7110, lon: -74.0721 },
        { nombre: "Cali", lat: 3.4516, lon: -76.5320 },
        { nombre: "Barranquilla", lat: 10.9685, lon: -74.7813 },
        { nombre: "Cartagena", lat: 10.3910, lon: -75.4794 },
        { nombre: "Santa Marta", lat: 11.2408, lon: -74.1990 },
        { nombre: "Bucaramanga", lat: 7.1193, lon: -73.1227 },
        { nombre: "Cúcuta", lat: 7.8939, lon: -72.5078 },
        { nombre: "Pereira", lat: 4.8133, lon: -75.6961 },
        { nombre: "Manizales", lat: 5.0703, lon: -75.5138 },
        { nombre: "Pasto", lat: 1.2136, lon: -77.2811 }
    ].map(Object.freeze));
    static buscarCiudad(nombre) {
        return ServicioEnvio.CIUDADES.find((c) => c.nombre === nombre) ?? null;
    }
    /** Distancia en línea recta (fórmula del haversine), en km. */
    distanciaKm(destino, origen = ServicioEnvio.ORIGEN) {
        const rad = (g) => (g * Math.PI) / 180;
        const dLat = rad(destino.lat - origen.lat);
        const dLon = rad(destino.lon - origen.lon);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(rad(origen.lat)) * Math.cos(rad(destino.lat)) * Math.sin(dLon / 2) ** 2;
        return 2 * ServicioEnvio.#RADIO_TIERRA_KM * Math.asin(Math.sqrt(a));
    }
    /**
    * Costo del envío en COP.
    * @param {number} km Distancia a la bodega.
    * @param {boolean} llueve true si llueve en el destino (recargo).
    * @param {number} subtotal Valor de los productos (envío gratis desde $250.000).
    */
    costo(km, llueve, subtotal) {
        if (!Number.isFinite(km) || km < 0) throw new RangeError("Distancia inválida.");
        if (subtotal >= ServicioEnvio.#ENVIO_GRATIS_DESDE) return 0;
        const base = ServicioEnvio.#TARIFA_BASE + Math.round(km) * ServicioEnvio.#TARIFA_KM;
        return llueve ? base + ServicioEnvio.#RECARGO_LLUVIA : base;
    }
    /** Pide al navegador la ubicación actual (requiere permiso y HTTPS). */
    ubicacionNavegador() {
        return new Promise((resolver, rechazar) => {
            if (!("geolocation" in navigator)) {
                rechazar(new Error("Este navegador no soporta geolocalización."));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolver({
                    nombre: "Mi ubicación actual", lat: pos.coords.latitude, lon:
                        pos.coords.longitude
                }),
                (err) => rechazar(new Error(err.code === 1 ? "Permiso de ubicación denegado." : "No se pudo obtener la ubicación.")),
                { timeout: 10000 }
            );
        });
    }
}