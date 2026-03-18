/**
 * dante.js  —  3-language cross-highlighting for Bangla / Italian / English
 *
 * Hover or click any word in the Italian or English column:
 *   • The source word glows gold (source-word)
 *   • Mapped words in the other worded columns glow amber (word-highlight)
 *   • Unmapped words fall back to soft line-highlight
 *   • The ENTIRE corresponding Bangla td gets highlighted (no word spans there)
 *
 * Hovering the Bangla column highlights the whole corresponding IT + EN line.
 *
 * Click to pin; click again / Escape to unpin.
 */

(function () {
  "use strict";

  /* ── Word-level mapping: Italian data-w → English data-w[] ─────── */
  const IT_TO_EN = {
    "nel": ["when"],
    "mezzo": ["half"],
    "cammin": ["journeyed"],
    "nostra": ["our"],
    "vita": ["lifes", "way"],
    "mi": ["i_found"],
    "ritrovai": ["found", "myself"],
    "selva": ["forest"],
    "oscura": ["shadowed"],
    "diritta": ["path"],
    "via": ["path"],
    "smarrita": ["stray"],
    "ahi": ["ah"],
    "dura": ["hard"],
    "cosa": ["it_was"],
    "selva2": ["forest_en"],
    "selvaggia": ["savage"],
    "aspra": ["dense", "difficult"],
    "forte": ["difficult"],
    "pensier": ["recall"],
    "rinova": ["renews"],
    "paura6": ["fear6"],
    "amara": ["bitter"],
    "morte": ["death"],
    "del_ben": ["the_good"],
    "trattar": ["retell"],
    "diro": ["ill_also", "tell"],
    "io_non": ["i_cannot"],
    "so": ["say"],
    "ridir": ["clearly", "say"],
    "pien": ["so_full"],
    "di_sonno": ["of_sleep"],
    "punto": ["just_at"],
    "verace": ["the_true"],
    "via12": ["path12"],
    "abbandonai": ["i_abandoned"],
    "al_pie": ["the_bottom"],
    "dun_colle": ["of_a_hill"],
    "valle": ["of_the_valley"],
    "di_paura": ["with_so_much_fear"],
    "il_cor": ["my_heart"],
    "guardai": ["i_looked"],
    "in_alto": ["on_high"],
    "e_vidi": ["and_saw"],
    "spalle": ["its_shoulders"],
    "vestite": ["clothed"],
    "de_raggi": ["by_the_rays"],
    "del_pianeta": ["of_that_same_planet"],
    "dritto": ["men_straight"],
    "allor": ["at_this"],
    "paura19": ["my_fear19"],
    "queta": ["quieted"],
    "la_notte": ["the_lake"],
    "lena": ["with_exhausted"],
    "affannata": ["breath"],
    "del_pelago": ["from_sea"],
    "a_la_riva": ["to_shore"],
    "si_volge": ["turns_back"],
    "a_lacqua": ["waters"],
    "perigliosa": ["the_dangerous"],
    "lanimo": ["my_spirit"],
    "fuggiva": ["fugitive"],
    "a_rimirar": ["to_look", "intently"],
    "lo_passo": ["at_the_pass"],
    "persona": ["any_man"],
    "viva": ["survive"],
    "il_corpo": ["body_rest"],
    "lasso": ["my_tired"],
    "posato": ["rest"],
    "ripresi": ["moving_again", "i_tried"],
    "piaggia": ["the_lonely_slope"],
    "diserta": ["the_lonely_slope"],
    "il_pie_fermo": ["my_firm_foot"],
    "ed_ecco": ["and_almost"],
    "una_lonza": ["a_leopard"],
    "leggera": ["very_quick"],
    "e_presta": ["and_lithe"],
    "macolato": ["a_spotted_hide"],
    "mi_si_partia": ["disappear"],
    "mpediva": ["he_so_impeded"],
    "tanto": ["he_so_impeded"],
    "ritornar": ["to_turn_back"],
    "temp_era": ["the_time_was"],
    "del_mattino": ["of_the_morning"],
    "e_il_sol": ["the_sun_was"],
    "montava": ["rising_now"],
    "lamor_divino": ["when_divine_love"],
    "mosse_di_prima": ["first_moved"],
    "quelle_cose_belle": ["those_things_of_beauty"],
    "dun_leone": ["a_lion"],
    "la_vista": ["the_fear_i_felt"],
    "fame": ["with_hunger"],
    "ne_tremesse": ["seemed_to_shudder"],
    "ed_una_lupa": ["and_then_a_she_wolf"],
    "brame": ["to_carry_every_craving"],
    "magrezza": ["in_her_leanness"],
    "viver_grame": ["brought_despair_to_many"],
    "la_speranza": ["hope"],
    "chio_perdei": ["that_i_abandoned"],
    "la_bestia_sanza_pace": ["that_restless_beast"],
    "mi_ripigneva": ["had_thrust_me_back"],
    "fioco": ["one_who_seemed_faint"],
    "gran_diserto": ["in_that_vast_wilderness"],
    "miserere_di_me": ["have_pity_on_me"],
    "gridai_a_lui": ["were_the_words_i_cried"],
    "od_ombra": ["a_shade_a_man"],
    "rispuosemi_non_omo": ["he_answered_me_not_man"],
    "omo_gia_fui": ["i_once_was_man"],
    "e_li_parenti": ["both_of_my_parents"],
    "miei_furon_lombardi": ["came_from_lombardy"],
    "mantoani_per_patria": ["and_both_claimed_mantua"],
    "nacqui_sub_iulio": ["and_i_was_born_though_late"],
    "e_vissi_a_roma": ["and_lived_in_rome"],
    "sotto_il_buono_augusto": ["under_the_good_augustus"],
    "falsi_e_bugiardi": ["and_lying_gods"],
    "poeta_fui": ["i_was_a_poet"],
    "e_cantai": ["and_i_sang"],
    "figliuol_danchise": ["son_of_anchises"],
    "che_venne_di_troia": ["who_had_come_from_troy"],
    "ilion_fu_combusto": ["the_pride_of_ilium"],
    "a_tanta_noia": ["to_wretchedness"],
    "il_dilettoso_monte": ["the_mountain_of_delight"],
    "e_cagion_di_tutta_gioia": ["of_every_joy"],
    "or_se_tu_quel_virgilio": ["and_are_you_then_that_virgil"],
    "e_quella_fonte": ["you_the_fountain"],
    "si_largo_fiume": ["so_rich_a_stream_of_speech"],
    "con_vergognosa_fronte": ["upon_my_brow"],
    "o_de_li_altri_poeti": ["o_light_and_honor"],
    "onore_e_lume": ["of_all_other_poets"],
    "vagliami_il_lungo_studio": ["may_my_long_study"],
    "e_il_grande_amore": ["and_the_intense_love"],
    "lo_tuo_volume": ["that_made_me_search_your_volume"],
    "tu_se_lo_mio_maestro": ["you_are_my_master"],
    "e_il_mio_autore": ["and_my_author_you"],
    "tu_se_solo_colui": ["the_only_one_from_whom"],
    "lo_bello_stilo": ["the_noble_style"],
    "che_mha_fatto_onore": ["for_which_i_have_been_honored"],
    "vedi_la_bestia": ["you_see_the_beast"],
    "famoso_saggio": ["help_me_o_famous_sage"],
    "aiutami_da_lei": ["to_stand_against_her"],
    "chella_mi_fa_tremar": ["for_she_has_made_my_blood"],
    "le_vene_e_i_polsi": ["and_pulses_shudder"],
    "a_te_convien_tenere": ["it_is_another_path"],
    "altro_viaggio": ["that_you_must_take"],
    "che_lagrimar_mi_vide": ["he_answered_when_he_saw"],
    "se_vuo_campar": ["if_you_would_leave"],
    "d_esto_loco_selvaggio": ["this_savage_wilderness"],
    "che_questa_bestia": ["the_beast_that_is_the_cause"],
    "per_la_qual_tu_gride": ["of_your_outcry"],
    "non_lascia_altrui_passar": ["allows_no_man_to_pass"],
    "per_la_sua_via": ["along_her_track"],
    "che_luccide": ["to_the_point_of_death"],
    "si_malvagia_e_ria": ["so_malicious"],
    "la_bramosa_voglia": ["her_greedy_will"],
    "ha_piu_fame_che_pria": ["shes_hungrier_than_ever"],
    "molti_son_li_animali": ["she_mates_with_many"],
    "infin_che_il_veltro": ["until_the_greyhound"],
    "verra_che_la_fara": ["arrives_inflicting_painful_death"],
    "questi_non_cibera_terra": ["that_hound_will_never_feed"],
    "ma_sapienza": ["in_wisdom_love_and_virtue"],
    "amore104": ["in_wisdom_love_and_virtue"],
    "e_virtute": ["in_wisdom_love_and_virtue"],
    "sara_tra_feltro_e_feltro": ["shall_be_between_two_felts"],
    "di_quella_umile_italia": ["he_will_restore_low_lying_italy"],
    "la_vergine_cammilla": ["the_maid_camilla"],
    "eurialo_e_turno": ["and_nisus_turnus_and_euryalus"],
    "questi_la_cacceera": ["and_he_will_hunt_that_beast"],
    "ne_lo_nferno": ["back_again_to_hell"],
    "la_onde_nvidia_prima": ["for_which_she_was_first_sent"],
    "dipartilla": ["above_by_envy"],
    "che_tu_mi_segui": ["to_follow_me"],
    "e_io_saro_tua_guida": ["and_i_shall_guide_you"],
    "per_loco_etterno": ["through_an_eternal_place"],
    "ove_udirai_le_disperate": ["where_you_shall_hear"],
    "strida": ["the_howls_of_desperation"],
    "vedrai_li_antichi_spiriti": ["and_see_the_ancient_spirits"],
    "dolenti": ["in_their_pain"],
    "cha_la_seconda_morte": ["as_each_of_them_laments"],
    "ciascun_grida": ["his_second_death"],
    "che_son_contenti": ["those_souls_who_are_content"],
    "nel_foco": ["within_the_fire"],
    "perche_speran": ["for_they_hope_to_reach"],
    "a_le_beate_genti": ["the_blessed_people"],
    "se_tu_vorrai_salire": ["as_high_as_these"],
    "piu_di_me_degna": ["a_soul_more_worthy"],
    "con_lei_ti_lascero": ["ill_leave_you_in_her_care"],
    "nel_mio_partire": ["when_i_depart"],
    "che_quello_imperador": ["because_that_emperor"],
    "che_la_su_regna": ["who_reigns_above"],
    "perch_i_fu_ribellante": ["since_i_have_been_rebellious"],
    "a_la_sua_legge": ["to_his_law"],
    "per_me_si_vegna": ["to_his_city"],
    "in_tutte_parti_impera": ["he_governs_everywhere"],
    "e_quivi_regge": ["but_rules_from_there"],
    "quivi_e_la_sua_citta": ["there_is_his_city"],
    "e_lalto_seggio": ["his_high_capital"],
    "oh_felice_colui": ["o_happy_those"],
    "cu_ivi_elegge": ["he_chooses_to_be_there"],
    "per_quello_dio": ["by_that_god"],
    "che_tu_non_conoscesti": ["whom_you_had_never_come_to_know"],
    "accio_chio_fugga": ["that_i_may_flee_this_evil"],
    "questo_male_e_peggio": ["and_worse_evils"],
    "che_tu_mi_meni": ["to_lead_me_to_the_place"],
    "la_dov_or_dicesti": ["of_which_you_spoke"],
    "la_porta_di_san_pietro": ["the_gateway_of_saint_peter"],
    "e_color_cui_tu_fai": ["and_those_whom_you_describe"],
    "cotanto_mesti": ["as_sorrowful"],
    "allor_si_mosse": ["then_he_set_out"],
    "e_io_li_tenni_dietro": ["and_i_moved_on_behind_him"],
  };

  /* Build reverse map EN → IT[] automatically */
  const EN_TO_IT = {};
  for (const [itKey, enKeys] of Object.entries(IT_TO_EN)) {
    for (const enKey of enKeys) {
      if (!EN_TO_IT[enKey]) EN_TO_IT[enKey] = [];
      EN_TO_IT[enKey].push(itKey);
    }
  }

  /* ── Cache DOM elements ──────────────────────────────────────────── */

  // .w spans by column and data-w key
  const itWords = {};   // key → [span, ...]
  const enWords = {};
  document.querySelectorAll("td.it .w").forEach(s => {
    const k = s.dataset.w; if (!k) return;
    (itWords[k] = itWords[k] || []).push(s);
  });
  document.querySelectorAll("td.en .w").forEach(s => {
    const k = s.dataset.w; if (!k) return;
    (enWords[k] = enWords[k] || []).push(s);
  });

  // All .w spans by line number, per column
  const itLines = {};   // lineNum → [span, ...]
  const enLines = {};
  document.querySelectorAll("td.it").forEach(td => {
    const ln = td.dataset.line; if (!ln) return;
    itLines[ln] = Array.from(td.querySelectorAll(".w"));
  });
  document.querySelectorAll("td.en").forEach(td => {
    const ln = td.dataset.line; if (!ln) return;
    enLines[ln] = Array.from(td.querySelectorAll(".w"));
  });

  // Bangla tds by line number
  const bnTds = {};     // lineNum → td element
  document.querySelectorAll("td.bn").forEach(td => {
    const ln = td.dataset.line; if (!ln) return;
    bnTds[ln] = td;
  });

  /* ── Clear helpers ───────────────────────────────────────────────── */
  function clearAll() {
    document.querySelectorAll(".w.source-word, .w.word-highlight, .w.line-highlight")
      .forEach(s => s.classList.remove("source-word", "word-highlight", "line-highlight"));
    document.querySelectorAll("td.bn.source-cell, td.bn.line-highlight")
      .forEach(td => td.classList.remove("source-cell", "line-highlight"));
  }

  /* ── Highlight Bangla td for a given line ────────────────────────── */
  function highlightBn(lineNum, strong) {
    const td = bnTds[String(lineNum)];
    if (!td) return;
    td.classList.add(strong ? "source-cell" : "line-highlight");
  }

  /* ── Main highlight logic ────────────────────────────────────────── */
  /**
   * @param {HTMLElement} sourceSpan  - hovered .w span
   * @param {string}      wordKey     - its data-w
   * @param {boolean}     isItalian   - which column it's in
   */
  function applyHighlight(sourceSpan, wordKey, isItalian) {
    clearAll();
    sourceSpan.classList.add("source-word");

    const parentTd = sourceSpan.closest("td");
    const lineNum = parentTd ? parentTd.dataset.line : null;

    // Always highlight the corresponding Bangla line
    if (lineNum) highlightBn(lineNum, true);

    if (isItalian) {
      const targets = IT_TO_EN[wordKey];
      if (targets && targets.length) {
        targets.forEach(k => (enWords[k] || []).forEach(s => s.classList.add("word-highlight")));
        // Also soft-highlight any EN words on the same line that weren't directly mapped
        if (lineNum && enLines[lineNum]) {
          enLines[lineNum].forEach(s => {
            if (!s.classList.contains("word-highlight"))
              s.classList.add("line-highlight");
          });
        }
      } else {
        // Full line fallback for EN
        if (lineNum && enLines[lineNum])
          enLines[lineNum].forEach(s => s.classList.add("line-highlight"));
      }
    } else {
      // English → Italian
      const targets = EN_TO_IT[wordKey];
      if (targets && targets.length) {
        targets.forEach(k => (itWords[k] || []).forEach(s => s.classList.add("word-highlight")));
        if (lineNum && itLines[lineNum]) {
          itLines[lineNum].forEach(s => {
            if (!s.classList.contains("word-highlight"))
              s.classList.add("line-highlight");
          });
        }
      } else {
        if (lineNum && itLines[lineNum])
          itLines[lineNum].forEach(s => s.classList.add("line-highlight"));
      }
    }
  }

  /**
   * Called when hovering the Bangla column — highlight entire IT + EN line
   */
  function applyBnHighlight(bnTd) {
    clearAll();
    const lineNum = bnTd.dataset.line;
    bnTd.classList.add("source-cell");
    if (lineNum) {
      (itLines[lineNum] || []).forEach(s => s.classList.add("line-highlight"));
      (enLines[lineNum] || []).forEach(s => s.classList.add("line-highlight"));
    }
  }

  /* ── Event delegation ────────────────────────────────────────────── */
  const table = document.getElementById("dante-table");
  if (!table) return;

  let pinned = false;
  let lastTarget = null;  // track what we last highlighted to avoid redundant clears

  table.addEventListener("mouseover", function (e) {
    if (pinned) return;

    // Bangla td — e.target could be the td itself or a text node wrapper
    const bnTd = e.target.closest("td.bn");
    if (bnTd) {
      if (lastTarget !== bnTd) { lastTarget = bnTd; applyBnHighlight(bnTd); }
      return;
    }

    // Word span in IT or EN
    const span = e.target.closest(".w");
    if (span) {
      if (lastTarget !== span) {
        lastTarget = span;
        const isIt = !!span.closest("td.it");
        applyHighlight(span, span.dataset.w, isIt);
      }
      return;
    }

    // Hovering over something else in the table (padding, ln-col, etc.)
    if (lastTarget) { lastTarget = null; clearAll(); }
  });

  // Use mouseleave on the whole table to clear when cursor exits
  table.addEventListener("mouseleave", function () {
    if (!pinned) { lastTarget = null; clearAll(); }
  });

  table.addEventListener("click", function (e) {
    // Bangla td click
    const bnTd = e.target.closest("td.bn");
    if (bnTd) {
      if (pinned && bnTd.classList.contains("source-cell")) {
        pinned = false; lastTarget = null; clearAll(); return;
      }
      applyBnHighlight(bnTd); pinned = true; lastTarget = bnTd; return;
    }

    // Word span click
    const span = e.target.closest(".w");
    if (!span) {
      pinned = false; lastTarget = null; clearAll(); return;
    }
    if (pinned && span.classList.contains("source-word")) {
      pinned = false; lastTarget = null; clearAll(); return;
    }
    const isIt = !!span.closest("td.it");
    applyHighlight(span, span.dataset.w, isIt);
    pinned = true; lastTarget = span;
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { pinned = false; lastTarget = null; clearAll(); }
  });

})();