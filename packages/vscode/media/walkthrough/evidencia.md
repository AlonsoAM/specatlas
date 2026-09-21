## Terminado significa que hay evidencia

Cada escenario se cierra con una evidencia: el **comando que se ejecutó**, su resultado y la huella de su salida.

```
satlas verify mi-cambio --scenario REQ-VENTAS-001-S1 --command "npm test" --by "Nombre Apellido"
```

La herramienta ejecuta el comando de verdad y guarda lo que pasó. Si la prueba falla, queda registrado como fallo: no hay forma de dar algo por terminado sin respaldo.

Al archivar, el cambio se pliega en la especificación viva y cada requisito se queda con los archivos que lo implementan. A partir de ahí, `Anclas y deriva del código` avisa cuando el código se mueve por debajo de lo especificado.
