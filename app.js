const SUPABASE_URL = "https://josnqfgwebmxdblfzobk.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_4WTotPf-jRxaEGmXLimUyw_mOOGSeyg";
const COUNTER_ID = "shared";
const LOCAL_CACHE_KEY = "two_person_counter_supabase_cache_v1";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const state = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY)) || {
  p1: 0,
  p2: 0,
};

const p1Btn = document.getElementById("p1Btn");
const p2Btn = document.getElementById("p2Btn");
const resetBtn = document.getElementById("resetBtn");
const p1CountEl = document.getElementById("p1Count");
const p2CountEl = document.getElementById("p2Count");

function render() {
  p1CountEl.textContent = state.p1;
  p2CountEl.textContent = state.p2;
  localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(state));
}

async function fetchInitialCounter() {
  const { data, error } = await supabaseClient
    .from("counters")
    .select("p1, p2")
    .eq("id", COUNTER_ID)
    .single();

  if (error) {
    console.error("Fehler beim Laden des Zählers:", error.message);
    return;
  }

  if (data) {
    state.p1 = data.p1 ?? 0;
    state.p2 = data.p2 ?? 0;
    render();
  }
}

async function updateCounter(nextP1, nextP2) {
  state.p1 = nextP1;
  state.p2 = nextP2;
  render();

  const { error } = await supabaseClient
    .from("counters")
    .update({ p1: state.p1, p2: state.p2 })
    .eq("id", COUNTER_ID);

  if (error) {
    console.error("Fehler beim Speichern in Supabase:", error.message);
  }
}

p1Btn.addEventListener("click", () => {
  navigator.vibrate?.(15);
  updateCounter(state.p1 + 1, state.p2);
});

p2Btn.addEventListener("click", () => {
  navigator.vibrate?.(15);
  updateCounter(state.p1, state.p2 + 1);
});

resetBtn.addEventListener("click", () => {
  if (confirm("Möchtest du beide Zähler wirklich auf 0 zurücksetzen?")) {
    updateCounter(0, 0);
  }
});

supabaseClient
  .channel("counter-shared-channel")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "counters",
      filter: `id=eq.${COUNTER_ID}`,
    },
    (payload) => {
      const updated = payload.new;
      state.p1 = updated.p1 ?? 0;
      state.p2 = updated.p2 ?? 0;
      render();
    }
  )
  .subscribe();

render();
fetchInitialCounter();