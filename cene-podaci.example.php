<?php
/* TROŠAK I ZARADA — vaši troškovi. Kopirajte u cene-podaci.php (pored api.php) i upišite prave brojeve.
   cene-podaci.php se NE stavlja na GitHub — repozitorijum je javan, a ovo su vaši troškovi.
   Program ga čita samo uz šifru za sinhronizaciju (api.php?action=prep).
   SVE JE BEZ PDV-a.

   mat — trošak materijala KLASIČNE pergole za JEDAN sistem, € bez PDV-a i bez motora:
         'pro' = projekcije (m), 'sir' = širine (m), 't' = red po projekciji, kolona po širini. */
return [
  'mat' => [
    'pro' => [3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7],
    'sir' => [3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10],
    't'   => [
      // [trošak za 3.5 m širine, za 4 m, …, za 10 m]  — jedan red za svaku projekciju
    ],
  ],
  'p' => [
    'motor'     => 85,    // motor i daljinski (€)
    'ekipa'     => 200,   // ekipa montera za jedan dan — pokriva i vožnju i montažu (€)
    'montera'   => 3,     // broj montera (za noćenje)
    'nocenje'   => 25,    // noćenje po čoveku (€)
    'km'        => 0.35,  // vozilo po km: gorivo, amortizacija, putarina (€)
    'granica'   => 150,   // dalje od ovoga (km, jedan smer) ekipa noći i ide jedan dan više
    'putDan'    => 1,     // koliko dana ekipe više kad se noći (dan za put)
    'd1'        => 30,    // 1 dan montaže do (m²)
    'd2'        => 50,    // 1,5 dan montaže do (m²); preko toga 2 dana
    'radionica' => 0,     // radionica i režija po pergoli (€); 0 = ne računa se
    'prag'      => 0.30,  // ispod ovoliko zarade na trošak (0.30 = 30 %) pregled pocrveni
    'pdv'       => 0.20,  // samo za red „preko firme"
  ],
];
