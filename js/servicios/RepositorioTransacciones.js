import { Transaccion } from "../modelo/Transaccion.js";
/**
* Guarda y recupera el historial de transacciones en localStorage.
* Serializa con toJSON() y reconstruye con Transaccion.desdeJSON().
*/
export class RepositorioTransacciones {
    static #CLAVE = "coquito-amarillo.historial";
    #almacen;
    constructor(almacen = globalThis.localStorage) {
        this.#almacen = almacen;
    }
    /** @returns {Transaccion[]} de la más reciente a la más antigua. */
    listar() {
        try {
            const crudo = JSON.parse(this.#almacen.getItem(RepositorioTransacciones.#CLAVE) ?? "[]");
            return crudo.flatMap((obj) => {
                try { return [Transaccion.desdeJSON(obj)]; } catch { return []; } // ignora registros dañados
            });
        } catch {
            return [];
        }
    }
    buscar(id) { return this.listar().find((t) => t.id === id) ?? null; }
    /** @param {Transaccion} transaccion */
    guardar(transaccion) {
        const lista = [transaccion, ...this.listar()];
        this.#almacen.setItem(RepositorioTransacciones.#CLAVE, JSON.stringify(lista));
    }
    limpiar() { this.#almacen.removeItem(RepositorioTransacciones.#CLAVE); }
}