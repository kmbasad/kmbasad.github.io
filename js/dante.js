/**
 * dante.js
 * --------
 * Handles word-level and line-level cross-highlighting between the
 * Italian and English columns of the Dante bilingual table.
 *
 * Strategy:
 *  1. A curated WORD_MAP maps specific Italian data-w values to their
 *     English counterparts (and vice-versa via the reverse map).
 *  2. When no word-map entry exists, the entire corresponding LINE
 *     in the opposite column is softly highlighted.
 *  3. The hovered word itself gets a stronger "source" highlight.
 *
 * All highlights are cleared on mouseleave / click-elsewhere.
 */

(function () {
  "use strict";

  /* ── Word-level mapping ───────────────────────────────────────────
     Keys are data-w attribute values from the ITALIAN column.
     Values are arrays of data-w values in the ENGLISH column.
     The reverse map is built automatically below.
  ─────────────────────────────────────────────────────────────────── */
  const IT_TO_EN = {
    // Line 1
    "nel":        ["when"],
    "mezzo":      ["half"],
    "cammin":     ["journeyed"],
    "nostra":     ["our"],
    "vita":       ["lifes", "way"],

    // Line 2
    "mi":         ["i_found"],
    "ritrovai":   ["found", "myself"],
    "selva":      ["forest"],
    "oscura":     ["shadowed"],

    // Line 3
    "diritta":    ["path"],
    "via":        ["path"],
    "smarrita":   ["stray"],

    // Line 4
    "ahi":        ["ah"],
    "dura":       ["hard"],
    "cosa":       ["it_was"],

    // Line 5
    "selva2":     ["forest_en"],
    "selvaggia":  ["savage"],
    "aspra":      ["dense", "difficult"],
    "forte":      ["difficult"],

    // Line 6
    "pensier":    ["recall"],
    "rinova":     ["renews"],
    "paura6":     ["fear6"],

    // Line 7
    "amara":      ["bitter"],
    "morte":      ["death"],

    // Line 8
    "del_ben":    ["the_good"],
    "trattar":    ["retell"],

    // Line 9
    "diro":       ["ill_also", "tell"],

    // Line 10
    "io_non":     ["i_cannot"],
    "so":         ["say"],
    "ridir":      ["clearly", "say"],

    // Line 11
    "pien":       ["so_full"],
    "di_sonno":   ["of_sleep"],
    "punto":      ["just_at"],

    // Line 12
    "verace":     ["the_true"],
    "via12":      ["path12"],
    "abbandonai": ["i_abandoned"],

    // Line 13
    "al_pie":     ["the_bottom"],
    "dun_colle":  ["of_a_hill"],

    // Lines 14–15
    "valle":      ["of_the_valley"],
    "di_paura":   ["with_so_much_fear"],
    "il_cor":     ["my_heart"],

    // Lines 16–18
    "guardai":    ["i_looked"],
    "in_alto":    ["on_high"],
    "e_vidi":     ["and_saw"],
    "spalle":     ["its_shoulders"],
    "vestite":    ["clothed"],
    "de_raggi":   ["by_the_rays"],
    "del_pianeta":["of_that_same_planet"],
    "dritto":     ["men_straight"],

    // Lines 19–21
    "allor":      ["at_this"],
    "paura19":    ["my_fear19"],
    "queta":      ["quieted"],
    "la_notte":   ["the_lake"],

    // Lines 22–24
    "lena":       ["with_exhausted"],
    "affannata":  ["breath"],
    "del_pelago": ["from_sea"],
    "a_la_riva":  ["to_shore"],
    "si_volge":   ["turns_back"],
    "a_lacqua":   ["waters"],
    "perigliosa": ["the_dangerous"],

    // Lines 25–27
    "lanimo":     ["my_spirit"],
    "fuggiva":    ["fugitive"],
    "a_rimirar":  ["to_look", "intently"],
    "lo_passo":   ["at_the_pass"],
    "persona":    ["any_man"],
    "viva":       ["survive"],

    // Lines 28–30
    "il_corpo":   ["body_rest"],
    "lasso":      ["my_tired"],
    "posato":     ["rest"],
    "ripresi":    ["moving_again", "i_tried"],
    "piaggia":    ["the_lonely_slope"],
    "diserta":    ["the_lonely_slope"],
    "il_pie_fermo":["my_firm_foot"],

    // Lines 31–33 (Leopard)
    "ed_ecco":    ["and_almost"],
    "una_lonza":  ["a_leopard"],
    "leggera":    ["very_quick"],
    "e_presta":   ["and_lithe"],
    "macolato":   ["a_spotted_hide"],

    // Lines 34–36
    "mi_si_partia":["disappear"],
    "mpediva":    ["he_so_impeded"],
    "tanto":      ["he_so_impeded"],
    "ritornar":   ["to_turn_back"],

    // Lines 37–39 (Dawn)
    "temp_era":   ["the_time_was"],
    "del_mattino":["of_the_morning"],
    "e_il_sol":   ["the_sun_was"],
    "montava":    ["rising_now"],
    "lamor_divino":["when_divine_love"],

    // Lines 40–42
    "mosse_di_prima":   ["first_moved"],
    "quelle_cose_belle":["those_things_of_beauty"],

    // Lines 43–45 (Lion)
    "dun_leone":  ["a_lion"],
    "la_vista":   ["the_fear_i_felt"],

    // Lines 46–48
    "fame":       ["with_hunger"],
    "ne_tremesse":["seemed_to_shudder"],

    // Lines 49–51 (She-wolf)
    "ed_una_lupa":["and_then_a_she_wolf"],
    "brame":      ["to_carry_every_craving"],
    "magrezza":   ["in_her_leanness"],
    "viver_grame":["brought_despair_to_many"],

    // Lines 52–54
    "la_speranza":["hope"],
    "chio_perdei": ["that_i_abandoned"],

    // Lines 58–60
    "la_bestia_sanza_pace":["that_restless_beast"],
    "mi_ripigneva":["had_thrust_me_back"],

    // Lines 61–63 (Virgil)
    "fioco":          ["one_who_seemed_faint"],
    "lungo silenzio": ["because_of_the_long_silence"],

    // Lines 64–66
    "gran_diserto":   ["in_that_vast_wilderness"],
    "miserere_di_me": ["have_pity_on_me"],
    "gridai_a_lui":   ["were_the_words_i_cried"],
    "od_ombra":       ["a_shade_a_man"],

    // Lines 67–69 (Virgil speaks)
    "rispuosemi_non_omo":["he_answered_me_not_man"],
    "omo_gia_fui":    ["i_once_was_man"],
    "e_li_parenti":   ["both_of_my_parents"],
    "miei_furon_lombardi":["came_from_lombardy"],
    "mantoani_per_patria":["and_both_claimed_mantua"],

    // Lines 70–72
    "nacqui_sub_iulio":  ["and_i_was_born_though_late"],
    "e_vissi_a_roma":    ["and_lived_in_rome"],
    "sotto_il_buono_augusto":["under_the_good_augustus"],
    "falsi_e_bugiardi":  ["and_lying_gods"],

    // Lines 73–75
    "poeta_fui":         ["i_was_a_poet"],
    "e_cantai":          ["and_i_sang"],
    "figliuol_danchise": ["son_of_anchises"],
    "che_venne_di_troia":["who_had_come_from_troy"],
    "ilion_fu_combusto": ["the_pride_of_ilium"],

    // Lines 76–78
    "a_tanta_noia":        ["to_wretchedness"],
    "il_dilettoso_monte":  ["the_mountain_of_delight"],
    "e_cagion_di_tutta_gioia":["of_every_joy"],

    // Lines 79–81
    "or_se_tu_quel_virgilio":["and_are_you_then_that_virgil"],
    "e_quella_fonte":        ["you_the_fountain"],
    "si_largo_fiume":        ["so_rich_a_stream_of_speech"],
    "con_vergognosa_fronte": ["upon_my_brow"],

    // Lines 82–84
    "o_de_li_altri_poeti":  ["o_light_and_honor"],
    "onore_e_lume":         ["of_all_other_poets"],
    "vagliami_il_lungo_studio":["may_my_long_study"],
    "e_il_grande_amore":    ["and_the_intense_love"],
    "lo_tuo_volume":        ["that_made_me_search_your_volume"],

    // Lines 85–87
    "tu_se_lo_mio_maestro": ["you_are_my_master"],
    "e_il_mio_autore":      ["and_my_author_you"],
    "tu_se_solo_colui":     ["the_only_one_from_whom"],
    "lo_bello_stilo":       ["the_noble_style"],
    "che_mha_fatto_onore":  ["for_which_i_have_been_honored"],

    // Lines 88–90
    "vedi_la_bestia":         ["you_see_the_beast"],
    "famoso_saggio":          ["help_me_o_famous_sage"],
    "aiutami_da_lei":         ["to_stand_against_her"],
    "chella_mi_fa_tremar":    ["for_she_has_made_my_blood"],
    "le_vene_e_i_polsi":      ["and_pulses_shudder"],

    // Lines 91–93
    "a_te_convien_tenere":  ["it_is_another_path"],
    "altro_viaggio":        ["that_you_must_take"],
    "che_lagrimar_mi_vide": ["he_answered_when_he_saw"],
    "se_vuo_campar":        ["if_you_would_leave"],
    "d_esto_loco_selvaggio":["this_savage_wilderness"],

    // Lines 94–96
    "che_questa_bestia":       ["the_beast_that_is_the_cause"],
    "per_la_qual_tu_gride":    ["of_your_outcry"],
    "non_lascia_altrui_passar":["allows_no_man_to_pass"],
    "per_la_sua_via":          ["along_her_track"],
    "che_luccide":             ["to_the_point_of_death"],

    // Lines 97–99
    "si_malvagia_e_ria":   ["so_malicious"],
    "la_bramosa_voglia":   ["her_greedy_will"],
    "ha_piu_fame_che_pria":["shes_hungrier_than_ever"],

    // Lines 100–102 (Greyhound)
    "molti_son_li_animali":["she_mates_with_many"],
    "infin_che_il_veltro":  ["until_the_greyhound"],
    "verra_che_la_fara":    ["arrives_inflicting_painful_death"],

    // Lines 103–105
    "questi_non_cibera_terra":["that_hound_will_never_feed"],
    "ma_sapienza":            ["in_wisdom_love_and_virtue"],
    "amore104":               ["in_wisdom_love_and_virtue"],
    "e_virtute":              ["in_wisdom_love_and_virtue"],
    "sara_tra_feltro_e_feltro":["shall_be_between_two_felts"],

    // Lines 106–108
    "di_quella_umile_italia": ["he_will_restore_low_lying_italy"],
    "la_vergine_cammilla":    ["the_maid_camilla"],
    "eurialo_e_turno":        ["and_nisus_turnus_and_euryalus"],

    // Lines 109–111
    "questi_la_cacceera":    ["and_he_will_hunt_that_beast"],
    "ne_lo_nferno":          ["back_again_to_hell"],
    "la_onde_nvidia_prima":  ["for_which_she_was_first_sent"],
    "dipartilla":            ["above_by_envy"],

    // Lines 112–114
    "che_tu_mi_segui":       ["to_follow_me"],
    "e_io_saro_tua_guida":   ["and_i_shall_guide_you"],
    "per_loco_etterno":      ["through_an_eternal_place"],

    // Lines 115–117 (Hell)
    "ove_udirai_le_disperate":["where_you_shall_hear"],
    "strida":                 ["the_howls_of_desperation"],
    "vedrai_li_antichi_spiriti":["and_see_the_ancient_spirits"],
    "dolenti":                ["in_their_pain"],
    "cha_la_seconda_morte":   ["as_each_of_them_laments"],
    "ciascun_grida":          ["his_second_death"],

    // Lines 118–120 (Purgatory)
    "che_son_contenti":   ["those_souls_who_are_content"],
    "nel_foco":           ["within_the_fire"],
    "perche_speran":      ["for_they_hope_to_reach"],
    "a_le_beate_genti":   ["the_blessed_people"],

    // Lines 121–123
    "se_tu_vorrai_salire": ["as_high_as_these"],
    "piu_di_me_degna":     ["a_soul_more_worthy"],
    "con_lei_ti_lascero":  ["ill_leave_you_in_her_care"],
    "nel_mio_partire":     ["when_i_depart"],

    // Lines 124–126
    "che_quello_imperador":["because_that_emperor"],
    "che_la_su_regna":     ["who_reigns_above"],
    "perch_i_fu_ribellante":["since_i_have_been_rebellious"],
    "a_la_sua_legge":      ["to_his_law"],
    "per_me_si_vegna":     ["to_his_city"],

    // Lines 127–129
    "in_tutte_parti_impera":["he_governs_everywhere"],
    "e_quivi_regge":        ["but_rules_from_there"],
    "quivi_e_la_sua_citta": ["there_is_his_city"],
    "e_lalto_seggio":       ["his_high_capital"],
    "oh_felice_colui":      ["o_happy_those"],
    "cu_ivi_elegge":        ["he_chooses_to_be_there"],

    // Lines 130–132
    "per_quello_dio":       ["by_that_god"],
    "che_tu_non_conoscesti":["whom_you_had_never_come_to_know"],
    "accio_chio_fugga":     ["that_i_may_flee_this_evil"],
    "questo_male_e_peggio": ["and_worse_evils"],

    // Lines 133–136
    "che_tu_mi_meni":       ["to_lead_me_to_the_place"],
    "la_dov_or_dicesti":    ["of_which_you_spoke"],
    "la_porta_di_san_pietro":["the_gateway_of_saint_peter"],
    "e_color_cui_tu_fai":   ["and_those_whom_you_describe"],
    "cotanto_mesti":        ["as_sorrowful"],
    "allor_si_mosse":       ["then_he_set_out"],
    "e_io_li_tenni_dietro": ["and_i_moved_on_behind_him"],
  };

  /* Build reverse map EN → IT */
  const EN_TO_IT = {};
  for (const [itKey, enKeys] of Object.entries(IT_TO_EN)) {
    for (const enKey of enKeys) {
      if (!EN_TO_IT[enKey]) EN_TO_IT[enKey] = [];
      EN_TO_IT[enKey].push(itKey);
    }
  }

  /* ── DOM helpers ─────────────────────────────────────────────────── */

  // Cache all .w spans by data-w value, separately for each column
  const itWords = {}; // data-w → [span, ...]
  const enWords = {}; // data-w → [span, ...]

  document.querySelectorAll("td.it .w").forEach(span => {
    const key = span.dataset.w;
    if (!key) return;
    if (!itWords[key]) itWords[key] = [];
    itWords[key].push(span);
  });

  document.querySelectorAll("td.en .w").forEach(span => {
    const key = span.dataset.w;
    if (!key) return;
    if (!enWords[key]) enWords[key] = [];
    enWords[key].push(span);
  });

  // Cache rows by line number, separately for each column
  const itLines = {}; // lineNum → [span, ...]
  const enLines = {}; // lineNum → [span, ...]

  document.querySelectorAll("td.it").forEach(td => {
    const line = td.dataset.line;
    if (!line) return;
    itLines[line] = Array.from(td.querySelectorAll(".w"));
  });

  document.querySelectorAll("td.en").forEach(td => {
    const line = td.dataset.line;
    if (!line) return;
    enLines[line] = Array.from(td.querySelectorAll(".w"));
  });

  /* ── Clear all highlights ────────────────────────────────────────── */
  function clearAll() {
    document.querySelectorAll(".w.source-word, .w.word-highlight, .w.line-highlight")
      .forEach(s => s.classList.remove("source-word", "word-highlight", "line-highlight"));
  }

  /* ── Apply highlight ────────────────────────────────────────────── */
  /**
   * @param {HTMLElement} hoveredSpan  - the span hovered/clicked
   * @param {string}      wordKey      - its data-w value
   * @param {boolean}     isItalian    - true if from the Italian column
   */
  function applyHighlight(hoveredSpan, wordKey, isItalian) {
    clearAll();

    // Mark the source word
    hoveredSpan.classList.add("source-word");

    // Get the line number of the hovered span
    const parentTd = hoveredSpan.closest("td");
    const lineNum  = parentTd ? parentTd.dataset.line : null;

    if (isItalian) {
      // Look up word-level matches in English
      const targets = IT_TO_EN[wordKey];
      if (targets && targets.length > 0) {
        targets.forEach(enKey => {
          (enWords[enKey] || []).forEach(s => s.classList.add("word-highlight"));
        });
      } else {
        // Fall back to line-level highlight
        if (lineNum && enLines[lineNum]) {
          enLines[lineNum].forEach(s => s.classList.add("line-highlight"));
        }
      }
    } else {
      // English → Italian
      const targets = EN_TO_IT[wordKey];
      if (targets && targets.length > 0) {
        targets.forEach(itKey => {
          (itWords[itKey] || []).forEach(s => s.classList.add("word-highlight"));
        });
      } else {
        // Fall back to line-level highlight
        if (lineNum && itLines[lineNum]) {
          itLines[lineNum].forEach(s => s.classList.add("line-highlight"));
        }
      }
    }
  }

  /* ── Event delegation on the table ─────────────────────────────── */
  const table = document.getElementById("dante-table");
  if (!table) return;

  let pinned = false; // true when user has clicked to pin a highlight

  // Hover
  table.addEventListener("mouseover", function (e) {
    if (pinned) return;
    const span = e.target.closest(".w");
    if (!span) return;
    const isIt = span.closest("td.it") !== null;
    applyHighlight(span, span.dataset.w, isIt);
  });

  table.addEventListener("mouseout", function (e) {
    if (pinned) return;
    const span = e.target.closest(".w");
    if (!span) return;
    // Only clear if we're actually leaving the word (not entering a child)
    if (!span.contains(e.relatedTarget)) {
      clearAll();
    }
  });

  // Click to pin/unpin
  table.addEventListener("click", function (e) {
    const span = e.target.closest(".w");
    if (!span) {
      // Clicking outside a word clears the pin
      pinned = false;
      clearAll();
      return;
    }

    if (pinned && span.classList.contains("source-word")) {
      // Clicking the pinned source again unpins
      pinned = false;
      clearAll();
      return;
    }

    // Pin a new highlight
    const isIt = span.closest("td.it") !== null;
    applyHighlight(span, span.dataset.w, isIt);
    pinned = true;
  });

  // ESC to unpin
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      pinned = false;
      clearAll();
    }
  });

})();
