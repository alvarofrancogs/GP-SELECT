# Integración pendiente

La web pública todavía usa datos mock (`vehicles.ts`); el catálogo real llega en 2F-C.3. El Admin (2F-C.2) ya usa la API real mediante `adminApi.ts`, con la autenticación existente por cookie HttpOnly.

El proxy de desarrollo conserva las rutas `/api` bajo el origen de Vite. Su destino provisional es `http://localhost:5000`; debe ajustarse al puerto real al conectar el backend. En producción se prevé servir frontend y API bajo el mismo origen.

## Cualificación comercial

No existe un endpoint de leads/contacto en el backend auditado. Antes de implementar el cuestionario se propone un único `POST /api/public/enquiries` público que reciba contexto del CTA, datos de contacto, preferencias relevantes y consentimiento de privacidad. El servidor deberá validar los campos requeridos según el contexto y devolver una confirmación sólo después de registrar o entregar correctamente la solicitud. La política de privacidad, destino de las solicitudes y retención de datos deben concretarse en esa fase. No se ha creado el endpoint ni modificado Domain.

`QualificationContext` y `qualificationUrl` preparan enlaces contextuales sin incluir datos personales. `QualificationDraft` describe campos opcionales para futuros pasos; no existe almacenamiento ni envío de datos en esta entrega.

No se incluyen pagos, checkout, depósitos ni reservas mediante pago.
