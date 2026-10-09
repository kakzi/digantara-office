const fs = require('fs')
const { Resvg } = require('@resvg/resvg-js')

const width = 1080
const height = 1440

const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background:#072217; font-family: 'DejaVu Sans', 'Liberation Sans', sans-serif;">
  <defs>
    <!-- Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#051c13" />
      <stop offset="45%" stop-color="#0d3f2c" />
      <stop offset="100%" stop-color="#04170f" />
    </linearGradient>

    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f7dc8a" />
      <stop offset="50%" stop-color="#dfb746" />
      <stop offset="100%" stop-color="#fdf3b8" />
    </linearGradient>

    <linearGradient id="dangerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b1317" />
      <stop offset="100%" stop-color="#220b0d" />
    </linearGradient>

    <linearGradient id="safeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#144d36" />
      <stop offset="100%" stop-color="#0b2e20" />
    </linearGradient>

    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#113929" />
      <stop offset="100%" stop-color="#09241a" />
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.5" />
    </filter>

    <!-- Subtle Islamic Star Pattern -->
    <pattern id="islamicPattern" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M32 0 L38 22 L60 22 L42 35 L48 58 L32 44 L16 58 L22 35 L4 22 L26 22 Z" fill="none" stroke="#236b4b" stroke-width="0.7" opacity="0.2" />
    </pattern>

    <!-- Vector Icon Symbols -->
    <g id="icon-shield">
      <path d="M24 4 L6 11 V22 C6 33.2 13.7 43.6 24 46 C34.3 43.6 42 33.2 42 22 V11 L24 4 Z" fill="none" stroke="#dfb746" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M17 23 L22 28 L32 18" fill="none" stroke="#fdf3b8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>

    <g id="icon-handshake">
      <path d="M12 28 L20 20 L28 28 L36 20 L44 28" fill="none" stroke="#dfb746" stroke-width="3" stroke-linecap="round"/>
      <path d="M4 22 L14 12 L24 22 L34 12 L44 22" fill="none" stroke="#fdf3b8" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="24" cy="24" r="18" fill="none" stroke="#dfb746" stroke-width="2.5"/>
    </g>

    <g id="icon-growth">
      <path d="M6 38 L18 26 L28 34 L42 12" fill="none" stroke="#dfb746" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M32 12 H42 V22" fill="none" stroke="#fdf3b8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="6" y1="42" x2="42" y2="42" stroke="#2a7755" stroke-width="2" stroke-linecap="round"/>
    </g>

    <g id="icon-check">
      <circle cx="12" cy="12" r="10" fill="#14532d" />
      <path d="M7 12 L11 16 L17 9" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>

    <g id="icon-cross">
      <circle cx="12" cy="12" r="10" fill="#7f1d1d" />
      <path d="M8 8 L16 16 M16 8 L8 16" fill="none" stroke="#fca5a5" stroke-width="2.5" stroke-linecap="round"/>
    </g>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
  <rect width="${width}" height="${height}" fill="url(#islamicPattern)" />

  <!-- Outer Luxury Borders -->
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="26" fill="none" stroke="#dfb746" stroke-width="2.2" opacity="0.75" />
  <rect x="36" y="36" width="${width - 72}" height="${height - 72}" rx="18" fill="none" stroke="#256e4c" stroke-width="1.2" opacity="0.4" />

  <!-- Corner Ornaments -->
  <g fill="#dfb746" opacity="0.8">
    <circle cx="50" cy="50" r="4.5" />
    <circle cx="${width - 50}" cy="50" r="4.5" />
    <circle cx="50" cy="${height - 50}" r="4.5" />
    <circle cx="${width - 50}" cy="${height - 50}" r="4.5" />
  </g>

  <!-- ==================== HEADER ==================== -->
  <text x="${width / 2}" y="85" text-anchor="middle" font-size="24" fill="#dfb746" font-weight="bold" letter-spacing="3">
    BISMILLAHIRRAHMANIRRAHIM
  </text>

  <!-- Brand Pill -->
  <g transform="translate(${width / 2 - 260}, 105)">
    <rect width="520" height="34" rx="17" fill="#0d3a28" stroke="#dfb746" stroke-width="1.4" />
    <text x="260" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="#fdf3b8" letter-spacing="2">KSPPS BMT NU · JAWA TIMUR</text>
  </g>

  <!-- Main Headline -->
  <text x="${width / 2}" y="195" text-anchor="middle" font-size="40" font-weight="bold" fill="#ffffff" letter-spacing="-0.5">
    Mau Usaha Berkah Tanpa Terjerat
  </text>
  <text x="${width / 2}" y="250" text-anchor="middle" font-size="48" font-weight="bold" fill="url(#goldGrad)" letter-spacing="1" filter="url(#goldGlow)">
    BUNGA &amp; RIBA?
  </text>

  <!-- Subtitle -->
  <text x="${width / 2}" y="295" text-anchor="middle" font-size="17" font-weight="normal" fill="#a7f3d0">
    Kembangkan usaha dan simpan dana secara amanah, transparan, dan murni syariah.
  </text>

  <!-- ==================== COMPARISON CARDS ==================== -->
  <!-- Card Kiri: Konvensional / Pinjol -->
  <g transform="translate(65, 330)" filter="url(#cardShadow)">
    <rect width="455" height="235" rx="14" fill="url(#dangerGrad)" stroke="#7f1d1d" stroke-width="1.6" />
    <!-- Header Box -->
    <path d="M 0 14 Q 0 0 14 0 L 441 0 Q 455 0 455 14 L 455 46 L 0 46 Z" fill="#4c1d24" />
    <text x="227" y="30" text-anchor="middle" font-size="15" font-weight="bold" fill="#fca5a5" letter-spacing="0.5">PINJAMAN KONVENSIONAL / PINJOL</text>

    <!-- Items with vector cross -->
    <g transform="translate(24, 65)">
      <use href="#icon-cross" x="0" y="0" />
      <text x="32" y="17" font-size="13.5" font-weight="normal" fill="#fecaca">Bunga berbunga saat terlambat bayar</text>
    </g>

    <g transform="translate(24, 105)">
      <use href="#icon-cross" x="0" y="0" />
      <text x="32" y="17" font-size="13.5" font-weight="normal" fill="#fecaca">Denda harian &amp; biaya tersembunyi</text>
    </g>

    <g transform="translate(24, 145)">
      <use href="#icon-cross" x="0" y="0" />
      <text x="32" y="17" font-size="13.5" font-weight="normal" fill="#fecaca">Teror penagihan tidak beretika</text>
    </g>

    <g transform="translate(24, 185)">
      <use href="#icon-cross" x="0" y="0" />
      <text x="32" y="17" font-size="13.5" font-weight="bold" fill="#ef4444">Riba menjauhkan keberkahan rezeki</text>
    </g>
  </g>

  <!-- Card Kanan: BMT NU Syariah -->
  <g transform="translate(560, 330)" filter="url(#cardShadow)">
    <rect width="455" height="235" rx="14" fill="url(#safeGrad)" stroke="#dfb746" stroke-width="1.8" />
    <!-- Header Box -->
    <path d="M 0 14 Q 0 0 14 0 L 441 0 Q 455 0 455 14 L 455 46 L 0 46 Z" fill="#14532d" />
    <text x="227" y="30" text-anchor="middle" font-size="15" font-weight="bold" fill="#fef08a" letter-spacing="0.5">SOLUSI SYARIAH BMT NU</text>

    <!-- Items with vector check -->
    <g transform="translate(24, 65)">
      <use href="#icon-check" x="0" y="0" />
      <text x="32" y="17" font-size="13.5" font-weight="normal" fill="#dcfce7">Akad Jual-Beli (Murabahah) transparan</text>
    </g>

    <g transform="translate(24, 105)">
      <use href="#icon-check" x="0" y="0" />
      <text x="32" y="17" font-size="13.5" font-weight="normal" fill="#dcfce7">Margin tetap di awal, angsuran pasti</text>
    </g>

    <g transform="translate(24, 145)">
      <use href="#icon-check" x="0" y="0" />
      <text x="32" y="17" font-size="13.5" font-weight="normal" fill="#dcfce7">Bebas denda zalim &amp; bunga berbunga</text>
    </g>

    <g transform="translate(24, 185)">
      <use href="#icon-check" x="0" y="0" />
      <text x="32" y="17" font-size="13.5" font-weight="bold" fill="#4ade80">100% Halal, barokah untuk keluarga</text>
    </g>
  </g>

  <!-- ==================== 3 PILAR LAYANAN ==================== -->
  <text x="${width / 2}" y="605" text-anchor="middle" font-size="22" font-weight="bold" fill="#ffffff" letter-spacing="0.5">
    3 PILAR LAYANAN UNGGULAN UNTUK ANGGOTA
  </text>
  <line x1="${width / 2 - 140}" y1="620" x2="${width / 2 + 140}" y2="620" stroke="#dfb746" stroke-width="2" />

  <!-- Pilar 1: Simpanan Wadiah -->
  <g transform="translate(65, 645)" filter="url(#cardShadow)">
    <rect width="950" height="92" rx="14" fill="url(#cardGrad)" stroke="#1e6b49" stroke-width="1.2" />
    <g transform="translate(22, 22)">
      <use href="#icon-shield" />
    </g>
    <text x="88" y="36" font-size="16.5" font-weight="bold" fill="#fef08a">1. Simpanan SiAmanah (Akad Wadiah Yad Dhamanah)</text>
    <text x="88" y="64" font-size="13" font-weight="normal" fill="#cbd5e1">Titipan dana aman tanpa potongan administrasi liar. Bebas ditarik sewaktu-waktu di seluruh cabang.</text>
  </g>

  <!-- Pilar 2: Pembiayaan Murabahah -->
  <g transform="translate(65, 755)" filter="url(#cardShadow)">
    <rect width="950" height="92" rx="14" fill="url(#cardGrad)" stroke="#1e6b49" stroke-width="1.2" />
    <g transform="translate(22, 22)">
      <use href="#icon-handshake" />
    </g>
    <text x="88" y="36" font-size="16.5" font-weight="bold" fill="#fef08a">2. Pembiayaan Usaha &amp; Modal Kerja (Akad Murabahah)</text>
    <text x="88" y="64" font-size="13" font-weight="normal" fill="#cbd5e1">Pengadaan barang &amp; alat usaha secara nyata. Angsuran ringan dan flat sampai lunas tanpa jebakan.</text>
  </g>

  <!-- Pilar 3: Simpanan Mudharabah -->
  <g transform="translate(65, 865)" filter="url(#cardShadow)">
    <rect width="950" height="92" rx="14" fill="url(#cardGrad)" stroke="#1e6b49" stroke-width="1.2" />
    <g transform="translate(22, 22)">
      <use href="#icon-growth" />
    </g>
    <text x="88" y="36" font-size="16.5" font-weight="bold" fill="#fef08a">3. Simpanan Berjangka Syariah (Akad Mudharabah)</text>
    <text x="88" y="64" font-size="13" font-weight="normal" fill="#cbd5e1">Investasi halal dengan bagi hasil adil. Dana produktif dikelola untuk memajukan usaha UMKM nahdliyin.</text>
  </g>

  <!-- ==================== PROOF BADGES ==================== -->
  <g transform="translate(65, 980)">
    <!-- Badge 1 -->
    <rect x="0" y="0" width="300" height="80" rx="12" fill="#0c3725" stroke="#226749" stroke-width="1.2" />
    <text x="150" y="34" text-anchor="middle" font-size="22" font-weight="bold" fill="url(#goldGrad)">35 CABANG</text>
    <text x="150" y="58" text-anchor="middle" font-size="12" font-weight="normal" fill="#86efac">Jaringan Kantor Aktif di Daerah</text>

    <!-- Badge 2 -->
    <rect x="325" y="0" width="300" height="80" rx="12" fill="#0c3725" stroke="#226749" stroke-width="1.2" />
    <text x="475" y="34" text-anchor="middle" font-size="22" font-weight="bold" fill="url(#goldGrad)">100% SYARIAH</text>
    <text x="475" y="58" text-anchor="middle" font-size="12" font-weight="normal" fill="#86efac">Sesuai Fatwa DSN-MUI</text>

    <!-- Badge 3 -->
    <rect x="650" y="0" width="300" height="80" rx="12" fill="#0c3725" stroke="#226749" stroke-width="1.2" />
    <text x="800" y="34" text-anchor="middle" font-size="22" font-weight="bold" fill="url(#goldGrad)">LEGAL &amp; AMAN</text>
    <text x="800" y="58" text-anchor="middle" font-size="12" font-weight="normal" fill="#86efac">Berbadan Hukum Koperasi Resmi</text>
  </g>

  <!-- ==================== CALL TO ACTION ==================== -->
  <g transform="translate(65, 1085)" filter="url(#cardShadow)">
    <rect width="950" height="185" rx="16" fill="url(#safeGrad)" stroke="#dfb746" stroke-width="2" />
    
    <text x="475" y="44" text-anchor="middle" font-size="23" font-weight="bold" fill="#ffffff" letter-spacing="0.5">
      Mari Buka Rekening &amp; Ajukan Pembiayaan Sekarang!
    </text>
    <text x="475" y="78" text-anchor="middle" font-size="14.5" font-weight="normal" fill="#d1fae5">
      Syarat mudah: Cukup KTP dan KK. Staf Teller &amp; Marketing kami siap melayani Anda dengan ramah.
    </text>

    <!-- Button inside container with balanced padding -->
    <g transform="translate(215, 105)">
      <rect width="520" height="48" rx="24" fill="url(#goldGrad)" />
      <text x="260" y="30" text-anchor="middle" font-size="14" font-weight="bold" fill="#06281a" letter-spacing="0.5">
        MEMBANGUN EKONOMI UMAT YANG MANDIRI &amp; BERKAH
      </text>
    </g>
  </g>

  <!-- ==================== FOOTER ==================== -->
  <g transform="translate(65, 1315)">
    <line x1="0" y1="0" x2="950" y2="0" stroke="#1f694a" stroke-width="1" />
    <text x="0" y="38" font-size="13.5" font-weight="bold" fill="#dfb746">KSPPS BMT NU · Layanan Perbankan Syariah Umat</text>
    <text x="0" y="60" font-size="12" font-weight="normal" fill="#94a3b8">Bojonegoro, Tuban, Lamongan &amp; Sekitarnya</text>

    <text x="950" y="38" text-anchor="end" font-size="13.5" font-weight="bold" fill="#ffffff">Web: bmtnu-core.id</text>
    <text x="950" y="60" text-anchor="end" font-size="12" font-weight="normal" fill="#86efac">Telp: (0353) 5212215 | WA Layanan Anggota</text>
  </g>
</svg>
`

const outputPathSvg = '/home/ubuntu/digantara-office/public/flyer-bmtnu.svg'
const outputPathPng = '/home/ubuntu/digantara-office/public/flyer-bmtnu.png'

fs.writeFileSync(outputPathSvg, svg, 'utf8')
console.log('SVG written')

const resvg = new Resvg(svg, {
  fitTo: {
    mode: 'width',
    value: width,
  },
  font: {
    loadSystemFonts: true,
    defaultFontFamily: 'DejaVu Sans',
  },
})

const pngData = resvg.render()
const pngBuffer = pngData.asPng()

fs.writeFileSync(outputPathPng, pngBuffer)
console.log('PNG rendered successfully. Size:', pngBuffer.length, 'bytes')
