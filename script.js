const db = window.supabaseClient;

const buscador = document.getElementById("buscador");
const resultados = document.getElementById("resultados");

const login = document.getElementById("login");
const panelAdmin = document.getElementById("panelAdmin");

const loginMensaje = document.getElementById("loginMensaje");
const adminMensaje = document.getElementById("adminMensaje");

let usuarioActual = null;
let esAdministrador = false;
let articuloEditando = null;

// CARGAR ARTICULOS
async function cargarArticulos() {
    const { data, error } = await db
        .from("articulos")
        .select("*")
        .order("numero", { ascending: true });

    if (error) {
        resultados.textContent = "Error al cargar los artículos.";
        console.error(error);
        return;
    }

    mostrarArticulos(data || []);
}

// MOSTRAR ARTICULOS

async function cargarArticulos() {
    const todosLosArticulos = [];
    const tamanoLote = 1000;
    let desde = 0;

    try {
        while (true) {
            const { data, error } = await db
                .from("articulos")
                .select("*")
                .order("numero", { ascending: true })
                .range(desde, desde + tamanoLote - 1);

            if (error) throw error;

            todosLosArticulos.push(...(data || []));

            if (!data || data.length < tamanoLote) {
                break;
            }

            desde += tamanoLote;
        }

        mostrarArticulos(todosLosArticulos);

    } catch (error) {
        resultados.textContent = "Error al cargar los artículos.";
        console.error(error);
    }
}

// BUSCADOR
buscador.addEventListener("input", async () => {
    const { data, error } = await db
        .from("articulos")
        .select("*")
        .order("numero");

    if (error) return;

    const texto = buscador.value.toLowerCase().trim();

    const filtrados = (data || []).filter(a =>
        String(a.numero).includes(texto) ||
        a.titulo.toLowerCase().includes(texto) ||
        a.contenido.toLowerCase().includes(texto) ||
        (a.categoria || "").toLowerCase().includes(texto)
    );

    mostrarArticulos(filtrados);
});

// COMPROBAR ADMINISTRADOR
async function comprobarAdministrador(usuario) {
    const { data, error } = await db
        .from("administradores")
        .select("user_id")
        .eq("user_id", usuario.id)
        .maybeSingle();

    if (error) {
        console.error(error);
        return false;
    }

    return !!data;
}

// ACTUALIZAR INTERFAZ
async function actualizarSesion(usuario) {
    usuarioActual = usuario;
    esAdministrador = false;

    if (usuario) {
        esAdministrador = await comprobarAdministrador(usuario);
    }

    if (usuario && esAdministrador) {
        login.hidden = true;
        panelAdmin.hidden = false;
        loginMensaje.textContent = "";
    } else {
        login.hidden = false;
        panelAdmin.hidden = true;

        if (usuario) {
            loginMensaje.textContent =
                "Esta cuenta no tiene permisos de administrador.";
        }
    }

    cargarArticulos();
}

// INICIAR SESION
document.getElementById("loginBtn").onclick = async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    loginMensaje.textContent = "Comprobando acceso...";

    const { data, error } = await db.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        loginMensaje.textContent = "No se pudo iniciar sesión.";
        console.error(error);
        return;
    }

    await actualizarSesion(data.user);
};

// CERRAR SESION
document.getElementById("salirBtn").onclick = async () => {
    await db.auth.signOut();
    articuloEditando = null;
    limpiarFormulario();
    await actualizarSesion(null);
};

// CREAR O EDITAR ARTICULO
document.getElementById("guardarBtn").onclick = async () => {
    const numero = Number(document.getElementById("numero").value);
    const titulo = document.getElementById("titulo").value.trim();
    const categoria = document.getElementById("categoria").value.trim() || "General";
    const contenido = document.getElementById("contenido").value.trim();

    if (!numero || !titulo || !contenido) {
        adminMensaje.textContent = "Completa número, título y contenido.";
        return;
    }

    const articulo = {
        numero,
        titulo,
        categoria,
        contenido
    };

    let resultado;

    if (articuloEditando !== null) {
        resultado = await db
            .from("articulos")
            .update(articulo)
            .eq("id", articuloEditando);
    } else {
        resultado = await db
            .from("articulos")
            .insert(articulo);
    }

    if (resultado.error) {
        adminMensaje.textContent = "Error al guardar el artículo.";
        console.error(resultado.error);
        return;
    }

    adminMensaje.textContent = "¡Artículo guardado correctamente!";
    articuloEditando = null;
    limpiarFormulario();
    cargarArticulos();
};

// PREPARAR EDICION
function editarArticulo(articulo) {
    articuloEditando = articulo.id;

    document.getElementById("numero").value = articulo.numero;
    document.getElementById("titulo").value = articulo.titulo;
    document.getElementById("categoria").value = articulo.categoria || "";
    document.getElementById("contenido").value = articulo.contenido;

    document.getElementById("formTitulo").textContent = "Editar artículo";
    document.getElementById("guardarBtn").textContent = "Guardar cambios";
    document.getElementById("cancelarBtn").hidden = false;

    document.getElementById("administracion").scrollIntoView();
}

// ELIMINAR ARTICULO
async function eliminarArticulo(id) {
    if (!confirm("¿Seguro que quieres eliminar este artículo?")) return;

    const { error } = await db
        .from("articulos")
        .delete()
        .eq("id", id);

    if (error) {
        adminMensaje.textContent = "No se pudo eliminar el artículo.";
        console.error(error);
        return;
    }

    adminMensaje.textContent = "Artículo eliminado.";
    cargarArticulos();
}

// LIMPIAR FORMULARIO
function limpiarFormulario() {
    document.getElementById("numero").value = "";
    document.getElementById("titulo").value = "";
    document.getElementById("categoria").value = "";
    document.getElementById("contenido").value = "";

    document.getElementById("formTitulo").textContent = "Crear nuevo artículo";
    document.getElementById("guardarBtn").textContent = "Guardar artículo";
    document.getElementById("cancelarBtn").hidden = true;
}

document.getElementById("cancelarBtn").onclick = () => {
    articuloEditando = null;
    limpiarFormulario();
    adminMensaje.textContent = "";
};

// COMPROBAR SESION AL ABRIR LA PAGINA
async function iniciarBiblioteca() {
    const { data, error } = await db.auth.getSession();

    if (error) {
        console.error(error);
        loginMensaje.textContent = "Error al comprobar la sesión.";
        return;
    }

    await actualizarSesion(data.session?.user || null);

    db.auth.onAuthStateChange((_event, session) => {
        setTimeout(() => {
            actualizarSesion(session?.user || null);
        }, 0);
    });
}

iniciarBiblioteca();
// =====================================
// IMPORTADOR MASIVO DE ARTICULOS POTATO
// =====================================

function leerCSV(texto) {
    texto = texto.replace(/^\uFEFF/, "");

    const primeraLinea = texto.split(/\r?\n/)[0];
    const separador = primeraLinea.split(";").length >
        primeraLinea.split(",").length ? ";" : ",";

    const filas = [];
    let fila = [];
    let campo = "";
    let comillas = false;

    for (let i = 0; i < texto.length; i++) {
        const caracter = texto[i];

        if (caracter === '"') {
            if (comillas && texto[i + 1] === '"') {
                campo += '"';
                i++;
            } else {
                comillas = !comillas;
            }
        } else if (caracter === separador && !comillas) {
            fila.push(campo);
            campo = "";
        } else if ((caracter === "\n" || caracter === "\r") && !comillas) {
            if (caracter === "\r" && texto[i + 1] === "\n") i++;

            fila.push(campo);
            if (fila.some(valor => valor.trim() !== "")) {
                filas.push(fila);
            }

            fila = [];
            campo = "";
        } else {
            campo += caracter;
        }
    }

    fila.push(campo);

    if (fila.some(valor => valor.trim() !== "")) {
        filas.push(fila);
    }

    return filas;
}

const botonImportar = document.getElementById("importarCSV");

botonImportar.addEventListener("click", async () => {
    const archivo = document.getElementById("archivoCSV").files[0];
    const estado = document.getElementById("estadoImportacion");

    if (!archivo) {
        estado.textContent = "Selecciona un archivo CSV.";
        return;
    }

    if (!archivo.name.toLowerCase().endsWith(".csv")) {
        estado.textContent = "El archivo debe ser CSV.";
        return;
    }

    try {
        botonImportar.disabled = true;
        estado.textContent = "Leyendo archivo...";

        const { data: sesion } = await db.auth.getSession();

        if (!sesion.session) {
            throw new Error("Debes iniciar sesión como administrador.");
        }

        const texto = await archivo.text();
        const filas = leerCSV(texto);

        if (filas.length < 2) {
            throw new Error("El archivo no contiene artículos.");
        }

        const encabezados = filas[0].map(
            valor => valor.trim().toLowerCase()
        );

        const columnas = ["numero", "titulo", "contenido", "categoria"];

        for (const columna of columnas) {
            if (!encabezados.includes(columna)) {
                throw new Error("Falta la columna: " + columna);
            }
        }

        const articulos = filas.slice(1).map(fila => {
            const obtener = nombre =>
                fila[encabezados.indexOf(nombre)]?.trim() || "";

            return {
                numero: Number(obtener("numero")),
                titulo: obtener("titulo"),
                contenido: obtener("contenido"),
                categoria: obtener("categoria") || "General"
            };
        });

        const numeros = new Set();

        for (const articulo of articulos) {
            if (
                !Number.isInteger(articulo.numero) ||
                articulo.numero <= 0 ||
                !articulo.titulo ||
                !articulo.contenido
            ) {
                throw new Error("Hay artículos con datos incorrectos.");
            }

            if (numeros.has(articulo.numero)) {
                throw new Error(
                    "El archivo repite el artículo " + articulo.numero
                );
            }

            numeros.add(articulo.numero);
        }

        let importados = 0;
        let omitidos = 0;

        for (let i = 0; i < articulos.length; i += 100) {
            const lote = articulos.slice(i, i + 100);
            const numerosLote = lote.map(a => a.numero);

            const { data: existentes, error: errorBusqueda } =
                await db.from("articulos")
                    .select("numero")
                    .in("numero", numerosLote);

            if (errorBusqueda) throw errorBusqueda;

            const numerosExistentes = new Set(
                existentes.map(a => a.numero)
            );

            const nuevos = lote.filter(
                a => !numerosExistentes.has(a.numero)
            );

            omitidos += lote.length - nuevos.length;

            if (nuevos.length > 0) {
                const { error } = await db
                    .from("articulos")
                    .insert(nuevos);

                if (error) throw error;

                importados += nuevos.length;
            }

            estado.textContent =
                "Procesando... " +
                Math.min(i + 100, articulos.length) +
                " de " + articulos.length;
        }

        await cargarArticulos();

        estado.textContent =
            "¡Importación terminada! " +
            importados + " artículos agregados. " +
            omitidos + " números ya existentes omitidos.";

        document.getElementById("archivoCSV").value = "";

    } catch (error) {
        console.error("Error de importación:", error);
        estado.textContent = "Error: " + error.message;
    } finally {
        botonImportar.disabled = false;
    }
});
