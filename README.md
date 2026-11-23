# 🥥 Coquito Amarillo SAS · Tienda Web

Prototipo transaccional de tienda en línea para la venta de productos típicos colombianos desde bodega en Medellín. Aplicación web de una sola página (SPA) desarrollada con **HTML5, CSS3 y JavaScript moderno (ES6+ modular)**, sin frameworks ni librerías externas.

🔗 **Sitio publicado:** [Ver demo en GitHub Pages](https://pablormrz.github.io/coquito-amarillo-webapp/)  
📁 **Repositorio:** [github.com/pablormrz/coquito-amarillo-webapp](https://github.com/pablormrz/coquito-amarillo-webapp)

---

## 📋 Funcionalidades

1. **Registro de cliente:** Datos personales y destino de entrega (ciudad o geolocalización GPS) con autorización según Ley 1581 de 2012.
2. **Catálogo interactivo:** Carga dinámica de productos típicos desde JSON con control de stock en tiempo real.
3. **Carrito de compras:** Adición, modificación de cantidades y eliminación de productos calculando subtotales al instante.
4. **Cotización de envío:** Cálculo automático de distancia desde bodega y recargo meteorológico consultando el clima en vivo (**Open-Meteo API**).
5. **Multimoneda:** Precios y totales en COP con conversión en tiempo real a USD y EUR (**ExchangeRate-API**).
6. **Pasarela de pagos simulada:** Soporte para Tarjeta de crédito/débito, PSE y Nequi con comisiones ilustrativas.
7. **Recibo digital:** Detalle completo de la transacción con identificador único y estado.
8. **Historial de compras:** Persistencia en `localStorage` para consultar transacciones anteriores.

---

## 📐 Diagrama de Clases (UML)

```mermaid
classDiagram
  direction TB
  class Usuario {
    <<abstract>>
    -#id
    -#nombre
    -#correo
    +get nombre()
    +get correo()
    +describir()*
  }
  class Cliente {
    -#destino
    -#puntos
    +acumular(valor)
    +describir()
    +toJSON()
  }
  class Producto {
    -#sku
    -#nombre
    -#precio
    -#stock
    +hayDisponible(cant)
    +reservar(cant)
    +desdeJSON(o)$
  }
  class ItemCarrito {
    -#producto
    -#cantidad
    +get subtotal()
    +toJSON()
  }
  class Carrito {
    -#items : Map
    +agregar(p, cant)
    +quitar(sku, cant)
    +cambiarCantidad(sku, cant)
    +get subtotal()
  }
  class Transaccion {
    -#id
    -#fecha
    -#estado
    -#cliente
    -#items
    -#envio
    -#pago
    -#moneda
    -#tasa
    +crear(datos)$
    +get total()
    +pagar(medio)
    +toJSON()
    +desdeJSON(o)$
  }
  class MedioPago {
    <<abstract>>
    +procesar(monto)
    +validar()*
    +calcularComision(monto)*
  }
  class PagoTarjeta {
    -#numero
    -#cvv
    -#titular
    -#vencimiento
    -#ultimos4
    -#marca
    +validar()
    +calcularComision(monto)
    +procesar(monto)
  }
  class PagoPSE {
    -#banco
    -#documento
    +validar()
    +calcularComision()
  }
  class PagoNequi {
    -#celular
    +validar()
    +calcularComision()
  }
  class ServicioHTTP {
    <<abstract>>
    +obtenerJSON(url)
  }
  class ServicioDivisas {
    -#cache
    +factor(de, a)
    +factorRespaldo(de, a)$
  }
  class ServicioClima {
    -#cache
    +actual(lat, lon)
  }
  class ServicioEnvio {
    +ORIGEN$
    +distanciaKm(destino)
    +costo(km, llueve, subtotal)
  }
  class RepositorioTransacciones {
    +listar()
    +guardar(t)
    +limpiar()
  }
  class CheckoutUI {
    <<controlador>>
    +registrar()
    +cotizar()
    +convertir(moneda)
    +pagar()
  }

  Usuario <|-- Cliente
  MedioPago <|-- PagoTarjeta
  MedioPago <|-- PagoPSE
  MedioPago <|-- PagoNequi
  ServicioHTTP <|-- ServicioDivisas
  ServicioHTTP <|-- ServicioClima
  Carrito *-- "0..*" ItemCarrito
  ItemCarrito --> "1" Producto
  Transaccion --> "1" Cliente
  Transaccion --> "1" MedioPago
  CheckoutUI --> Carrito
  CheckoutUI ..> ServicioDivisas : usa
  CheckoutUI ..> ServicioClima : usa
  CheckoutUI ..> ServicioEnvio : usa
  CheckoutUI ..> Transaccion : crea
  RepositorioTransacciones ..> Transaccion : serializa
```

---

## 💳 Medios de Pago y Seguridad

- **Selección dinámica:** Los formularios de pago permanecen ocultos hasta seleccionar un medio (Tarjeta, PSE o Nequi).
- **Tarjeta de crédito/débito:**
  - Formateo visual automático: grupos de 4 dígitos para Visa/Mastercard y `4-6-5` para American Express.
  - Inserción automática de barra separadora en vencimiento (`MM/AA`).
  - Validación de longitud (15 o 16 dígitos), fecha no vencida, CVV (3 o 4 dígitos) y **algoritmo de Luhn**.
- **PSE:** Validación de banco, tipo de persona y documento de identidad.
- **Nequi:** Validación de número celular colombiano (10 dígitos).
- **Privacidad estricta:** El número de tarjeta y el CVV nunca se almacenan ni se envían; solo se validan en memoria y en el recibo únicamente se muestran los últimos 4 dígitos (ej. `Visa •••• 1111`).

---

## 🧪 Guía Rápida de Pruebas

> ⚠️ Los pagos son **simulados** con fines académicos. No use datos de tarjetas reales.

### Tarjetas de prueba sugeridas

| Franquicia | Número (sin espacios) | Se muestra | Vencimiento y CVV | Resultado en recibo |
|---|---|---|---|---|
| **Visa** (16 dígitos) | `4111111111111111` | `4111 1111 1111 1111` | Futuro (ej. `12/28`) - `123` | `Visa •••• 1111` |
| **American Express** (15 dígitos) | `378282246310005` | `3782 822463 10005` | Futuro (ej. `01/30`) - `1234` | `Amex •••• 0005` |
| **Mastercard** (16 dígitos)| `5105105105105100` | `5105 1051 0510 5100` | Futuro (ej. `07/33`) - `321` | `Mastercard •••• 5100` |

### Flujo de prueba recomendado:
1. Completa el **Paso 1 (Tus datos)** y marca la casilla de autorización.
2. Agrega productos al carrito en el **Paso 2**.
3. Pulsa **Cotizar envío** en el **Paso 4** para calcular costo y clima.
4. Elige un medio de pago en el **Paso 5**, ingresa los datos de prueba y pulsa **Pagar**.
5. Revisa el recibo generado y comprueba que la compra queda registrada en el **Historial**.

---

## 🌐 Servicios Externos

- **Tasas de cambio:** [ExchangeRate-API](https://www.exchangerate-api.com) para conversión de divisas.
- **Meteorología:** [Open-Meteo](https://open-meteo.com) para consultar condiciones climáticas en destino.
- **Geolocalización:** `navigator.geolocation` para ubicar al usuario con su permiso.

*La app incluye degradación elegante: si una API externa no responde, utiliza valores de respaldo para permitir completar la compra.*

---

## 📁 Estructura del Proyecto

```
coquito-amarillo-webapp/
├── index.html              # Interfaz principal (HTML5 semántico)
├── css/
│   └── estilos.css         # Estilos responsivos
├── data/
│   └── productos.json      # Catálogo de productos
├── js/
│   ├── main.js             # Punto de entrada
│   ├── modelo/             # Clases del dominio (Usuario, Cliente, Producto, Carrito, Transaccion)
│   ├── pagos/              # Clases de pago (MedioPago, PagoTarjeta, PagoPSE, PagoNequi)
│   ├── servicios/          # APIs y persistencia (Clima, Divisas, Envio, Repositorio)
│   └── ui/                 # Interfaz y eventos (CheckoutUI)
└── README.md
```

---

## 📄 Licencia

Proyecto académico · Licencia MIT.