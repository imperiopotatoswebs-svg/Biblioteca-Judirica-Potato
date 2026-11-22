console.log("1. Cargando supabase.js");

console.log("2. Supabase disponible:", !!window.supabase);

const SUPABASE_URL = "https://mvgucdnqmyskspstzhwf.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ub2iyhNfkFFrqksOfHxI6A_6JFNmBuC";

try {
    window.supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    console.log("3. Cliente creado:", !!window.supabaseClient);

} catch (error) {
    console.error("ERROR CREANDO CLIENTE:", error);
}