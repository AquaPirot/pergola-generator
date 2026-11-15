<?php
/* PREPORUČENA CENA — troškovi i marža. Kopirajte u cene-podaci.php (pored api.php) i upišite prave brojeve.
   cene-podaci.php se NE stavlja na GitHub — repozitorijum je javan, a ovo su vaši troškovi.
   Program ga čita samo uz šifru za sinhronizaciju (api.php?action=prep).

   mat — trošak materijala KLASIČNE pergole za JEDAN sistem, € bez PDV-a i bez motora:
         'pro' = projekcije (m), 'sir' = širine (m), 't' = red po projekciji, kolona po širini.
   p   — podešavanja formule (isto kao list „Podešavanja" u Excel predlogu). */
return [
  'mat' => [
    'pro' => [3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7],
    'sir' => [3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10],
    't'   => [
      // [trošak za 3.5 m širine, za 4 m, …, za 10 m]  — jedan red za svaku projekciju
    ],
  ],
  'p' => [
    'motor'    => 85,    // motor i daljinski (€)
    'ekipa'    => 200,   // ekipa montera — jedan dan (€)
    'montera'  => 3,     // broj montera
    'nocenje'  => 25,    // noćenje po čoveku (€)
    'km'       => 0.35,  // vozilo po km: gorivo, amortizacija, putarina (€)
    'brzina'   => 70,    // prosečna brzina u vožnji (km/h)
    'sati'     => 8,     // sati u radnom danu
    'granica'  => 150,   // noćenje kad je mesto dalje od (km, jedan smer)
    'd1'       => 30,    // 1 dan montaže do (m²)
    'd2'       => 50,    // 1,5 dan montaže do (m²); preko toga 2 dana
    'mMax'     => 1.00,  // marža za male pergole (1.00 = 100 %)
    'a0'       => 15,    // … važi do površine (m²)
    'mMin'     => 0.50,  // marža za velike pergole
    'a1'       => 70,    // … važi od površine (m²)
    'pdv'      => 0.20,
    'zaokr'    => 50,    // zaokruživanje naviše (€)
  ],
];
