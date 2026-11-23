/**
* Punto de entrada: carga el catálogo desde el JSON, crea los objetos
* del modelo y los servicios, y se los entrega al controlador de la UI.
*/
import { Producto } from "./modelo/Producto.js";
import { Carrito } from "./modelo/Carrito.js";
import { ServicioDivisas } from "./servicios/ServicioDivisas.js";
import { ServicioClima } from "./servicios/ServicioClima.js";
import { ServicioEnvio } from "./servicios/ServicioEnvio.js";
import { RepositorioTransacciones } from "./servicios/RepositorioTransacciones.js";
import { CheckoutUI } from "./ui/CheckoutUI.js";
try {
    const respuesta = await fetch("data/productos.json");
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const datos = await respuesta.json();
    const catalogo = datos.map((obj) => Producto.desdeJSON(obj)); // RF-02
    const ui = new CheckoutUI({
        catalogo,
        carrito: new Carrito(),
        divisas: new ServicioDivisas(),
        clima: new ServicioClima(),
        envio: new ServicioEnvio(),
        repositorio: new RepositorioTransacciones()
    });
    ui.iniciar();
} catch (error) {
    document.getElementById("avisos").innerHTML =
        `<p class="aviso aviso--error">No se pudo cargar el catálogo (${error.message}). ` +
        `Abre el proyecto con Live Server o desde GitHub Pages, no con doble clic.</p>`;
    console.error(error);
}