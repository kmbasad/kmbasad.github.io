"""Standard colloquial (চলিত) Bangla verb paradigms and a first guess at the
Dhaka (Bangladeshi urban) form of each. Persons: 1 আমি, 2 তুমি, 3 সে, h আপনি/তিনি."""
P4 = ['1', '2', '3', 'h']

def consonant(B, L=None, P=None):
    """B: stem before ল/ছ/ত/ব (কর, শুন, জান); L: lowered stem of করে/শোনে/লেখে;
    P: stem of the perfect and করে-participle (জেন for জান)."""
    L = L or B; P = P or B
    std, dh = {}, {}
    def put(cat, s, d=None): std[cat] = s; dh[cat] = d if d is not None else s
    put('pres.1', B + 'ি'); put('pres.2', L + 'ো'); put('pres.3', L + 'ে'); put('pres.h', L + 'েন')
    for p, e, de in [('1', 'ছি', 'তেছি'), ('2', 'ছ', 'তেছো'), ('3', 'ছে', 'তেছে'), ('h', 'ছেন', 'তেছেন')]:
        put('prog.' + p, B + e, B + de)
    for p, e, de in [('1', 'েছি', 'ছি'), ('2', 'েছ', 'ছো'), ('3', 'েছে', 'ছে'), ('h', 'েছেন', 'ছেন')]:
        put('perf.' + p, P + e, B + de)
    for p, e, de in [('1', 'লাম', 'লাম'), ('2', 'লে', 'লা'), ('3', 'ল', 'ল'), ('h', 'লেন', 'লেন')]:
        put('past.' + p, B + e, B + de)
    for p, e, de in [('1', 'ছিলাম', 'তেছিলাম'), ('2', 'ছিলে', 'তেছিলা'), ('3', 'ছিল', 'তেছিল'), ('h', 'ছিলেন', 'তেছিলেন')]:
        put('pprog.' + p, B + e, B + de)
    for p, e, de in [('1', 'েছিলাম', 'ছিলাম'), ('2', 'েছিলে', 'ছিলা'), ('3', 'েছিল', 'ছিল'), ('h', 'েছিলেন', 'ছিলেন')]:
        put('pperf.' + p, P + e, B + de)
    for p, e, de in [('1', 'তাম', 'তাম'), ('2', 'তে', 'তা'), ('3', 'ত', 'ত'), ('h', 'তেন', 'তেন')]:
        put('hab.' + p, B + e, B + de)
    for p, e, de in [('1', 'ব', 'বো'), ('2', 'বে', 'বা'), ('3', 'বে', 'বে'), ('h', 'বেন', 'বেন')]:
        put('fut.' + p, B + e, B + de)
    put('imp.2', L + 'ো'); put('imp.h', B + 'ুন', L + 'েন'); put('imp.3', B + 'ুক')
    put('neg.1', B + 'িনি', B + 'ি নাই'); put('neg.2', L + 'োনি', L + 'ো নাই')
    put('neg.3', L + 'েনি', L + 'ে নাই'); put('neg.h', L + 'েননি', L + 'েন নাই')
    put('inf', B + 'তে'); put('cond', B + 'লে'); put('conj', P + 'ে'); put('vn', L + 'া'); put('vn.gen', L + 'ার')
    return std, dh

RAISE_E = {'মেটা', 'ফেরা', 'শেখা', 'ভেজা', 'মেলা', 'চেনা', 'মেশা', 'ভেড়া'}
def raise_(X):
    """The stem vowel rises before ি: ঘোরা > ঘুরিয়ে, শেখা > শিখিয়ে (but দেখা > দেখিয়ে)."""
    st = X[:-1]
    for a, b in [('ো', 'ু'), ('ও', 'উ')]:
        if a in st: return st.replace(a, b, 1)
    if X in RAISE_E: return st.replace('ে', 'ি', 1)
    return st

def aa(X, short=False):
    """Derived stems in া/ো: দেখা, জানা, এগো. S is the stem of the perfect; a short
    stem (পৌঁছা, জন্মা) makes it পৌঁছেছে, not পৌঁছিয়েছে."""
    R = raise_(X)
    S = R + 'ি'
    std, dh = {}, {}
    def put(cat, s, d=None): std[cat] = s; dh[cat] = d if d is not None else s
    put('pres.1', X + 'ই'); put('pres.2', X + 'ও'); put('pres.3', X + 'য়'); put('pres.h', X + 'ন')
    for p, e in [('1', 'চ্ছি'), ('2', 'চ্ছ'), ('3', 'চ্ছে'), ('h', 'চ্ছেন')]:
        put('prog.' + p, X + e, X + e + ('ো' if p == '2' else ''))
    for p, e, de in [('1', 'য়েছি', 'ইছি'), ('2', 'য়েছ', 'ইছো'), ('3', 'য়েছে', 'ইছে'), ('h', 'য়েছেন', 'ইছেন')]:
        put('perf.' + p, (X[:-1] + e[2:] if short else S + e), R + 'া' + de)
    for p, e, de in [('1', 'লাম', 'লাম'), ('2', 'লে', 'লা'), ('3', 'ল', 'ল'), ('h', 'লেন', 'লেন')]:
        put('past.' + p, X + e, X + de)
    for p, e, de in [('1', 'চ্ছিলাম', 'চ্ছিলাম'), ('2', 'চ্ছিলে', 'চ্ছিলা'), ('3', 'চ্ছিল', 'চ্ছিল'), ('h', 'চ্ছিলেন', 'চ্ছিলেন')]:
        put('pprog.' + p, X + e, X + de)
    for p, e, de in [('1', 'য়েছিলাম', 'ইছিলাম'), ('2', 'য়েছিলে', 'ইছিলা'), ('3', 'য়েছিল', 'ইছিল'), ('h', 'য়েছিলেন', 'ইছিলেন')]:
        put('pperf.' + p, (X[:-1] + e[2:] if short else S + e), R + 'া' + de)
    for p, e, de in [('1', 'তাম', 'তাম'), ('2', 'তে', 'তা'), ('3', 'ত', 'ত'), ('h', 'তেন', 'তেন')]:
        put('hab.' + p, X + e, X + de)
    for p, e, de in [('1', 'ব', 'বো'), ('2', 'বে', 'বা'), ('3', 'বে', 'বে'), ('h', 'বেন', 'বেন')]:
        put('fut.' + p, X + e, X + de)
    put('imp.2', X + 'ও'); put('imp.h', X + 'ন'); put('imp.3', X + 'ক')
    put('neg.1', X + 'ইনি', X + 'ই নাই'); put('neg.2', X + 'ওনি', X + 'ও নাই')
    put('neg.3', X + 'য়নি', X + 'য় নাই'); put('neg.h', X + 'ননি', X + 'ন নাই')
    put('inf', X + 'তে'); put('cond', X + 'লে'); put('conj', X[:-1] + 'ে' if short else S + 'য়ে'); put('vn', X + 'নো'); put('vn.gen', X + 'নোর')
    return std, dh

def table(rows):
    """Explicit paradigm: cat -> (standard, dhaka) or cat -> standard (unchanged)."""
    std, dh = {}, {}
    for cat, v in rows.items():
        s, d = v if isinstance(v, tuple) else (v, v)
        std[cat] = s; dh[cat] = d
    return std, dh

def vowel(B, E, persons_pres, prog, perf_std, perf_dh, past_std, past_dh, hab_std, hab_dh,
          fut, fut_dh, imp2, imph, imph_dh, imp3, neg, inf_std, inf_dh, cond_std, cond_dh, conj, vn, vn_dh):
    """Vowel-final roots (খা, পা, দে, নে, যা, হ)."""
    rows = {}
    for p, s in zip(P4, persons_pres):
        rows['pres.' + p] = s if not isinstance(s, tuple) else s
    for p, e in zip(P4, ['চ্ছি', 'চ্ছ', 'চ্ছে', 'চ্ছেন']):
        rows['prog.' + p] = (prog + e, prog + e + ('ো' if p == '2' else ''))
    for p, e, de in zip(P4, ['েছি', 'েছ', 'েছে', 'েছেন'], ['ছি', 'ছো', 'ছে', 'ছেন']):
        rows['perf.' + p] = (perf_std + e, perf_dh + de)
    for p, e, de in zip(P4, ['লাম', 'লে', 'ল', 'লেন'], ['লাম', 'লা', 'ল', 'লেন']):
        rows['past.' + p] = (past_std + e, past_dh + de)
    for p, e, de in zip(P4, ['চ্ছিলাম', 'চ্ছিলে', 'চ্ছিল', 'চ্ছিলেন'], ['চ্ছিলাম', 'চ্ছিলা', 'চ্ছিল', 'চ্ছিলেন']):
        rows['pprog.' + p] = (prog + e, prog + de)
    for p, e, de in zip(P4, ['েছিলাম', 'েছিলে', 'েছিল', 'েছিলেন'], ['ছিলাম', 'ছিলা', 'ছিল', 'ছিলেন']):
        rows['pperf.' + p] = (perf_std + e, perf_dh + de)
    for p, e, de in zip(P4, ['তাম', 'তে', 'ত', 'তেন'], ['তাম', 'তা', 'ত', 'তেন']):
        rows['hab.' + p] = (hab_std + e, hab_dh + de)
    for p, e, de in zip(P4, ['ব', 'বে', 'বে', 'বেন'], ['বো', 'বা', 'বে', 'বেন']):
        rows['fut.' + p] = (fut + e, fut_dh + de)
    rows['imp.2'] = imp2; rows['imp.h'] = (imph, imph_dh); rows['imp.3'] = imp3
    for p, (s, d) in zip(P4, neg): rows['neg.' + p] = (s, d)
    rows['inf'] = (inf_std, inf_dh); rows['cond'] = (cond_std, cond_dh); rows['conj'] = conj
    rows['vn'] = (vn, vn_dh); rows['vn.gen'] = (vn + 'র', vn_dh + 'র')
    return table(rows)

PERS_NAME = {'1': 'আমি', 't': 'তুই', '2': 'তুমি', '3': 'সে', 'h': 'আপনি/তিনি'}
CAT_NAME = {
    'pres': 'সাধারণ বর্তমান', 'prog': 'ঘটমান বর্তমান', 'perf': 'পুরাঘটিত বর্তমান', 'past': 'সাধারণ অতীত',
    'pprog': 'ঘটমান অতীত', 'pperf': 'পুরাঘটিত অতীত', 'hab': 'নিত্যবৃত্ত অতীত', 'fut': 'ভবিষ্যৎ',
    'imp': 'অনুজ্ঞা', 'neg': 'না-বাচক অতীত (-নি)', 'inf': 'অসমাপিকা: -তে', 'cond': 'অসমাপিকা: -লে',
    'conj': 'অসমাপিকা: -এ', 'vn': 'ক্রিয়াবিশেষ্য', 'vn.gen': 'ক্রিয়াবিশেষ্য (-র)',
}
