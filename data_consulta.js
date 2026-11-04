// Datos prácticos para la consulta, tomados de la «Guía práctica para consultar con caracol»
// (Omo Okan Oshún) que aportó el usuario. Se carga después de data.js y reemplaza las listas
// de iré y osogbo por las de la guía (se conservan los id anteriores para no romper consultas viejas).

// Letras mayores: se tiran una vez. Las menores (5, 6, 7, 9, 11) se tiran dos veces.
window.LETRAS_MAYORES = [1,2,3,4,8,10,12,13,14,15,16];

// Tabla de la mano para cuando la primera letra es menor (segunda letra del 1 al 12).
// I = izquierda, D = derecha.
window.MANO_TABLA = {
  5: "DDDDIDDDDDDD",
  6: "DDDDIIIDIDDD",
  7: "DDDDIIIDDDDD",
  9: "DDDDIIIDIDDD",
  11:"DDDDIIIDIDID"
};
// Devuelve {mano:"izquierda"|"derecha", motivo, general:bool}
window.manoDe = function(a,b){
  const may = window.LETRAS_MAYORES.includes(a);
  if(a===b) return {mano:"izquierda",motivo:"Tonti (la misma letra dos veces)",general:false};
  if(may) return {mano:"izquierda",motivo:"La primera letra es mayor",general:false};
  if(b<=12){ const c=window.MANO_TABLA[a]&&window.MANO_TABLA[a][b-1];
    if(c) return {mano:c==="I"?"izquierda":"derecha",motivo:"Según la tabla de la guía",general:false}; }
  return {mano:"derecha",motivo:"Menor seguida de mayor (regla general; la tabla de la guía llega hasta el 12)",general:true};
};

// Rezo de cada letra (como aparece en la guía). Del 13 al 16 la guía no los trae.
window.REZO_LETRA = {
  1:"Achekana, matakana, okanchoncho ofitele, ofatele.",
  2:"Temitani kinkamache moyumbo Olokun.",
  3:"Akerikonko, boboniche, oloddo atarugo, atarima kosile bokeibbo.",
  4:"Apatarita bebe aguacha.",
  5:"Oshé osaundere ibade Yewá fonde.",
  6:"Alabara, achebara, komokikate anó, komokikate eyó, komokikate arayé.",
  7:"Odima achamaru, adawomi, ada lorisha.",
  8:"Dende la iború, dende la iboyá, dende la boshishé.",
  9:"Osawo, iboriwo, afoniku Oyá Yansa, ayiloda afefe ikú.",
  10:"Ofún yega, kimafun ikú, kimafun anó, kimafun eyó, kimafun tale tale elese.",
  11:"Ojuani shogbe guatete guau.",
  12:"Eyilá chebora aggana aggana agá."
};

// Tipos de iré (20) y osogbo (16) de la guía; los más usados primero.
window.IRE_TIPOS = [
  {id:"ariku",nombre:"Iré Arikú",desc:"Bien de salud"},
  {id:"owo",nombre:"Iré Owó",desc:"Bien por dinero"},
  {id:"elese_osha",nombre:"Iré Lese Osha",desc:"Bien por el santo"},
  {id:"elese_eggun",nombre:"Iré Lese Eggun",desc:"Bien por el muerto"},
  {id:"elese_eledda",nombre:"Iré Lese Eledá",desc:"Bien por su cabeza"},
  {id:"aye",nombre:"Iré Ayé",desc:"Bien a través del mundo"},
  {id:"otonowa",nombre:"Iré Otonowa",desc:"Bien del cielo"},
  {id:"omo",nombre:"Iré Omó",desc:"Bien por su hijo"},
  {id:"ashegun",nombre:"Iré Ashegún Otá",desc:"Bien por la piedra del santo"},
  {id:"buyoko",nombre:"Iré Buyoko",desc:"Asentamiento y seguridad"},
  {id:"lowo",nombre:"Iré Lowo",desc:"Bien por su mano"},
  {id:"oma",nombre:"Iré Omá",desc:"Bien de inteligencia"},
  {id:"deleno",nombre:"Iré Dewantolokun",desc:"Bien por el mar"},
  {id:"araoko",nombre:"Iré Araoko",desc:"Bien por el campo"},
  {id:"araonu",nombre:"Iré Ara Onú",desc:"Bien por el otro mundo"},
  {id:"okuni",nombre:"Iré Okuní",desc:"Bien por su marido"},
  {id:"obini",nombre:"Iré Obiní",desc:"Bien por su mujer"},
  {id:"babatobi",nombre:"Iré Babatobi",desc:"Bien por su padre"},
  {id:"iyatobi",nombre:"Iré Iyatobi",desc:"Bien por su madre"},
  {id:"bata",nombre:"Iré Batá",desc:"Bien por fiesta"}
];
window.OSOGBO_TIPOS = [
  {id:"iku",nombre:"Ikú",desc:"Muerte"},
  {id:"ano",nombre:"Arún",desc:"Enfermedad"},
  {id:"eyo",nombre:"Eyó",desc:"Discusión y tragedia"},
  {id:"ofo",nombre:"Ofó",desc:"Pérdida"},
  {id:"araye",nombre:"Arayé",desc:"Problemas"},
  {id:"ona",nombre:"Oná",desc:"Tropiezos, dificultades"},
  {id:"ogu",nombre:"Ogú",desc:"Brujería"},
  {id:"tiyatiya",nombre:"Tiya-tiya",desc:"Chismes"},
  {id:"elenu",nombre:"Elenu",desc:"Lengua"},
  {id:"achelu",nombre:"Achelú",desc:"Policía, justicia"},
  {id:"shepe",nombre:"Shepé",desc:"Maldición"},
  {id:"ina",nombre:"Iña",desc:"Candela, golpes"},
  {id:"akoba",nombre:"Akobá",desc:"Algo de repente"},
  {id:"fitibo",nombre:"Fitibó",desc:"Muerte de repente"},
  {id:"afoshe",nombre:"Afoshé",desc:"Polvos malos"},
  {id:"ofo_buyoko",nombre:"Ofó ni Buyoko",desc:"Pérdida de la estabilidad"}
];

// Con qué se completa un iré coto (no completo) y lo que puede pedir el Orisha.
window.YALE_CON = ["Lariche","Kaure","Obi omi tuto","Kobori","Addimú","Ebbó shure","Ebbó bukere","Isogui","Shampola","Ebbó misí","Adó kiki","Eyebale","Eyebale tentelese"];
// Causas (intori) más comunes de un osogbo.
window.INTORI = ["Eggun","Ogú","Shepé","Lese Eledá","Lowo Arayé","Osha","Obiní","Okuní","Omó"];
// Orishas para el onire (quién defiende).
window.ONIRE_LISTA = ["Elegguá","Oggún","Oshosi","Obbatalá","Yemayá","Oshún","Shangó","Oyá","Babalú Ayé","Aggayú","Olokun","Orunmila","Osain","Oduduwa","Ibeyis","Eggun"];
