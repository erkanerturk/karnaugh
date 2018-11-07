// count number of variables within the expression
function CountVar(s) {
  var chars = {},
    rv = '';
  var s = s.replace(/[^a-zA-Z]/g, ''); //a'dan z'ye A'dan Z'ye global arama yapar(küçük büyük harfe dikkat etmemesi için gi)

  for (var i = 0; i < s.length; ++i) {
    if (!(s[i] in chars)) {
      //eğer girdinin i. karakteri chars dizisinde yoksa
      chars[s[i]] = 1;
      //console.log(s.length);
      console.log(chars);
      rv += s[i]; //rv stringine s'nin i. karakterini ekler
      console.log(rv);
    }
  }

  return rv.length;
}

// loop to replace the variables with the truth table value
function replaceVar(expression) {
  for (var i = 0; i < TruthTable.length; i++) {
    string = expression.replace(/a/g, TruthTable[i][0].Variable);
    console.log(string);
    string = string.replace(/b/g, TruthTable[i][1].Variable);
    string = string.replace(/c/g, TruthTable[i][2].Variable);
    string = string.replace(/d/g, TruthTable[i][3].Variable);

    if (eval(string) > 0) {
      document.getElementById(TruthTable[i].ButtonUIName).click();
    }
  }
}

document.getElementById('equation').addEventListener('change', function() {
  // check if input is valid
  if (isNaN(this.value) && this.value.match(/[0-9]/) == null) {
    //girilen değer sayı değilse işleme al
    var strlower = this.value.toLowerCase();

    console.log(strlower);
    //countvar fonksiyonuna gider
    var varNum = CountVar(this.value);
    //a-z olarak girilen harf sayısını döner

    var func = strlower.split('+'); //aralarında + varsa onları bölüyor
    console.log('func bu ', func);

    for (var i = 0; i < func.length; i++) {
      func[i] = func[i].trim(); //boşluklarını siler

      // put times(*)symbol between variables
      //func[i] = func[i].split(/([a-z])/).join("&").replace("&", "").split("&&").join("&").split("&!&").join("&!");  //a-z tüm karakterleri ayırıp aralarına & ekleyip eğer ki
      func[i] = func[i].split(/([a-z])/); //parçalara ayırdı
      console.log('split', func[i]);
      func[i] = func[i].join('&'); //hepsini arasına & ekleyerek geri birleştirdi
      console.log('join', func[i]);
      func[i] = func[i].replace('&', ''); //ilk & işaretini hiçbirşeye çevirdi
      console.log('replace', func[i]);
      func[i] = func[i].split('&&'); //arasında && bulunanları parçalara ayırdı
      console.log('split', func[i]);
      func[i] = func[i].join('&'); //ayırdıklarını arasına & ekleyerek birleştirdi
      console.log('join', func[i]);
      func[i] = func[i].split('&!&'); // arasında &!& bulunanları parçalara ayırdı
      console.log('split', func[i]);
      func[i] = func[i].join('&!'); // onları  &! şeklinde tekrar birleştirdi
      console.log('join', func[i]);
      // r_trim to remove * from the final of the string
      func[i] = func[i].substr(0, func[i].length - 1); //sondaki & karakterini sildi
      console.log(func[i]);
      console.log('');
    }

    strlower = func.join(' | '); // bulduğu func stringlerini aralarına | ekleyerek birleştirdi
    console.log(strlower);
    switch (
      varNum //harf sayısını kontrol ediyor
    ) {
      case 4: //4 ise otomatik olarak 4 değişkeni seçiyor
        document.getElementById('FourVariableRB').click();
        replaceVar(strlower);
        break;

      case 3: //3 ise otomatik olarak 3 değişkeni seçiyor
        document.getElementById('ThreeVariableRB').click();
        replaceVar(strlower);
        break;

      default:
        //3 veya 4 değilse
        if (varNum < 3) {
          //3'ten küçükse iki değişkeni seçiyor

          document.getElementById('TwoVariableRB').click();
          replaceVar(strlower);
        } else if (varNum > 4) {
          //4'ten büyükse yanlış giriş uyarısı veriyor
          alert('Invalid input');
        }
    }
  } else {
    alert('Invalid input');
  }
});

document.getElementById('equation').addEventListener('keyup', function(event) {
	//console.log("tiklanan keycode: "+event.keyCode);
	// Number 13 is the "Enter" key on the keyboard
	if (event.keyCode == 13) {
    document.getElementById('equation').dispatchEvent(new Event('change'));
  }
});
