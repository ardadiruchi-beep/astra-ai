# Utilidad académica del MCP astra-ai

## Qué problema resuelve

Durante el estudio de morfofisiopatología (medicina), usar una app de ayuda de
estudio como Astra AI implica un ciclo manual repetido: cambiar de ventana,
copiar la pregunta, pegarla, esperar, leer la respuesta, volver a los apuntes.
Ese trabajo operativo se repite decenas de veces por sesión, interrumpe la
atención y **no deja registro** de lo consultado.

El MCP `astra-ai` conecta OpenCode con la app Astra AI instalada en el Mac:
la IA orquesta el estudio desde un solo lugar — escribe la pregunta, la envía,
lee la respuesta por OCR y guarda la captura — mientras el estudiante se
concentra en comprender, contrastar y tomar decisiones.

## Para quién

Estudiantes de ciencias de la salud que ya usan apps de ayuda de estudio y una
IA de escritorio (opencode) para organizar su estudio.

## En qué dimensión del aprendizaje aporta

1. **Comprensión conceptual y recuperación activa.** La IA genera preguntas de
   repaso de la materia (p. ej. "¿Qué marcadores inmunohistoquímicos distinguen
   un adenocarcinoma de un carcinoma escamoso pulmonar?") y las contrasta con
   Astra, obligando al estudiante a analizar y validar la respuesta contra su
   bibliografía en vez de copiarla pasivamente.
2. **Organización y evidencia del estudio.** Cada sesión deja capturas con
   fecha en `data/capturas/`: un registro verificable del material consultado,
   útil para repasos y para mostrar el propio proceso de aprendizaje.
3. **Eficiencia operativa.** Se elimina el copiar/pegar manual y la pérdida de
   contexto al alternar ventanas: más tiempo dedicado al análisis y la
   interpretación, menos a la manipulación de las herramientas.

## Caso concreto (antes / después)

**Antes.** Para repasar "adenocarcinoma vs. carcinoma escamoso", el estudiante
alternaba entre apuntes, Astra y capturas manuales: ~10 minutos de manipulación
por tema, sin registro y con interrupciones constantes de atención.

**Después.** Un solo pedido: *"Pregúntale a Astra qué marcadores
inmunohistoquímicos distinguen adenocarcinoma de carcinoma escamoso pulmonar y
resúmeme la respuesta"*. OpenCode envía la pregunta con `astra_preguntar`, lee
la respuesta con OCR, la sintetiza y deja la captura guardada. El estudiante
solo valida la respuesta contra su bibliografía (ver proyecto ADScope).

## Límites honestos

- Astra AI es una **ayuda de estudio**, no una fuente clínica: toda respuesta
  debe contrastarse con bibliografía.
- La lectura de la respuesta es por OCR y puede errar en textos pequeños.
- El valor del MCP está en el flujo de estudio (preguntar, leer, registrar),
  no en sustituir el juicio del estudiante.
