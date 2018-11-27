// Constants
const MaxVariableCount = 4;
const VariableNames = new Array('A', 'B', 'C', 'D');
const Width = new Array(0, 2, 2, 4, 4); // width of Kmap for each VariableCount
const Height = new Array(0, 2, 2, 2, 4); // height of Kmap for each VariableCount
const BitOrder = new Array(0, 1, 3, 2); // bits across and down Kmap
const BackgroundColor = 'white';
const AllowDontCare = false; // true doesn't guarantee a minimal solution
const DontCare = 'X';

// Variables (initialized here)
let VariableCount = 2; //1..4
let TruthTable = new Array(); // truth table structure[row][variable]
let KMap = new Array(); // KMap[across][down]
let Equation = new Array(); // solution results
let FunctionText = ''; // F(ABC)=
let EquationHighlightColor = 'rgb(243,194,86)';
let Heavy = 20;

for (let i = 0; i < Math.pow(2, MaxVariableCount); i++) {
  Equation[i] = new Array(); // for each term in result function
  Equation[i].ButtonUIName = 'EQ' + i; // used to generate HTML IDs
  Equation[i].Expression = ''; // HTML text for term
  Equation[i].Rect = null; // 'rect' for term
  Equation.UsedLength = 0; // # of terms in current result function
}

Equation.UsedLength = 1;
Equation[0].Expression = '0';

// initialize the truth table and kmap structure for the given number of variables
function InitializeTables(VarCount) {
  console.log('InitializeTables', VarCount);
  TruthTable = new Array();
  KMap = new Array();
  VariableCount = VarCount;
  KMap.Width = Width[VariableCount];
  KMap.Height = Height[VariableCount];

  for (let i = 0; i < Math.pow(2, VariableCount); i++) {
    TruthTable[i] = new Array();
    TruthTable[i].Index = i;
    TruthTable[i].Name = i.toString(2);
    TruthTable[i].ButtonUIName = 'TT' + TruthTable[i].Name;
    TruthTable[i].TTROWUIName = 'TTROW' + TruthTable[i].Name;
    for (let j = 0; j < Math.pow(2, VariableCount); j++) {
      TruthTable[i][j] = new Array();
      TruthTable[i][j].Variable = (i & (1 << (VariableCount - (1 + j))) ? 1 : 0) ? true : false;
      TruthTable[i][j].Name = VariableNames[j];
      TruthTable[i][j].KMapEntry = null;
    }
  }

  KMap.XVariables = KMap.Width / 2;
  KMap.YVariables = KMap.Height / 2;

  for (let w = 0; w < KMap.Width; w++) {
    KMap[w] = new Array();
    for (let h = 0; h < KMap.Height; h++) {
      KMap[w][h] = new Array();
      KMap[w][h].Value = false;
      mapstr =
        BinaryString(BitOrder[w], KMap.XVariables) + BinaryString(BitOrder[h], KMap.YVariables);
      mapval = parseInt(mapstr, 2);
      KMap[w][h].TruthTableEntry = TruthTable[mapval];
      KMap[w][h].TruthTableEntry.KMapEntry = KMap[w][h];
      KMap[w][h].ButtonUIName = 'KM' + KMap[w][h].TruthTableEntry.Name;
      KMap[w][h].TDUIName = 'TD' + KMap[w][h].TruthTableEntry.Name;
      KMap[w][h].Covered = false;
      KMap[w][h].Variable = new Array();
      for (let i = 0; i < VariableCount; i++) {
        KMap[w][h].Variable[i] = KMap[w][h].TruthTableEntry[i].Variable;
      }
    }
  }

  FunctionText = 'ƒ(';
  for (let i = 0; i < VariableCount; i++) {
    FunctionText += VariableNames[i];
  }
  FunctionText += ')';
}

InitializeTables(VariableCount);

// returns a color to use for the backround for a given boolean value
//    Value is expected to be "1", "0", or "X"
function HighlightColor(Value) {
  if (Value == '1') return 'rgb(200,90,60)'; //0x00FF00;
  if (Value == '0') return 'rgb(0,195,151)'; //~0xFF0000;
  return 'gray'; //0x7F7F7F;
}

// returns a color to use for rollover highlighting
//    Value is expected to be "1", "0", or "X"
function RectHighlightColor(Value) {
  return EquationHighlightColor;
}

// init code (setup display according to query parameters)
function Load() {
  //sayfa açıldığında linkte variables ya da dontcare var ise onun değerine linkte yazanı yazar
  if (PageParameter('Variables') == '3') {
    ChangeVariableNumber(3);
  } else if (PageParameter('Variables') == '2') {
    ChangeVariableNumber(2);
  } else if (PageParameter('Variables') == '4') {
    ChangeVariableNumber(4);
  } else {
    ChangeVariableNumber(VariableCount);
  }
  if (PageParameter('DontCare') == 'true') {
    ToggleDontCare();
  }
}

window.onload = Load; //sayfa yüklendiğinde Load fonksiyonunu çalıştır

// constructs a Rect type
function CreateRect(x, y, w, h) {
  let Obj = new Array();
  Obj.x = x;
  Obj.y = y;
  Obj.w = w;
  Obj.h = h;
  return Obj;
}

// Comparison of two trinary 'boolean' values (a boolean value or don't care)
function Compare(Value1, Value2) {
  if (Value1 == Value2 || Value1 == DontCare || Value2 == DontCare) {
    return true;
  } else {
    return false;
  }
}

// Determines if a Rect with a given value fits on the KMap: it 'fits' if every square of the Rect
// matches (copmares with) the TestValue.
// Assumes top left of Rect is within the KMap.
// Assumes Rect is not larger than KMap
function TestRect(Rect, TestValue) {
  for (let dx = 0; dx < Rect.w; dx++) {
    for (let dy = 0; dy < Rect.h; dy++) {
      let Test = KMap[(Rect.x + dx) % KMap.Width][(Rect.y + dy) % KMap.Height].Value;
      if (!Compare(TestValue, Test)) {
        return false;
      }
    }
  }
  return true;
}

// Returns true if for every square of the Rect in the KMap, the .Covered flag is set
//    or the value of the square is don't care.
function IsCovered(Rect) {
  for (let dx = 0; dx < Rect.w; dx++) {
    for (let dy = 0; dy < Rect.h; dy++) {
      if (!KMap[(Rect.x + dx) % KMap.Width][(Rect.y + dy) % KMap.Height].Covered) {
        //treat dont care's as already covered
        if (!(KMap[(Rect.x + dx) % KMap.Width][(Rect.y + dy) % KMap.Height].Value == DontCare)) {
          return false;
        }
      }
    }
  }
  return true;
}

// Sets the .Covered flag for every square of the Rect in the KMap
function Cover(Rect, IsCovered) {
  for (let dx = 0; dx < Rect.w; dx++) {
    for (let dy = 0; dy < Rect.h; dy++) {
      KMap[(Rect.x + dx) % KMap.Width][(Rect.y + dy) % KMap.Height].Covered = IsCovered;
    }
  }
}

// Tries every x,y location in the KMap to see if the given rect size (w,h) will fit there
//   (matches in value).  For each location that fits, creates a rect and adds it to the Found
//   array.  If DoCover is true, also sets the KMap .Cover flag for the rects that fit.
function SearchRect(w, h, TestValue, Found, DoCover) {
  if (w > KMap.Width || h > KMap.Height) {
    return; // rect is too large
  }

  let across = KMap.Width == w ? 1 : KMap.Width;
  let down = KMap.Height == h ? 1 : KMap.Height;
  for (let x = 0; x < across; x++) {
    for (let y = 0; y < down; y++) {
      let Rect = CreateRect(x, y, w, h);
      if (TestRect(Rect, TestValue)) {
        if (!IsCovered(Rect)) {
          Found[Found.length] = Rect;
          if (DoCover) Cover(Rect, true);
        }
      }
    }
  }
}

// Iterates through an array of Rects (in order) to determine which of them
//  cover something in the KMap and which don't (because previous ones already
//  have covered enough).  Adds rects that do cover something to the Used array.
function TryRects(Rects, Used) {
  for (let j = 0; j < Rects.length; j++) {
    let Rect = Rects[j];
    if (TestRect(Rect, true)) {
      if (!IsCovered(Rect)) {
        Used[Used.length] = Rect;
        Cover(Rect, true);
      }
    }
  }
}

// Adds the given Weight to every element of the Weights map that corresponds to the Rect.
function AddRectWeight(Weights, Rect, Weight) {
  for (let dx = 0; dx < Rect.w; dx++) {
    for (let dy = 0; dy < Rect.h; dy++) {
      Weights[(Rect.x + dx) % KMap.Width][(Rect.y + dy) % KMap.Height] += Weight;
    }
  }
}

// Retrieves a weight value of a rect, by summing the weight of each square in the Weights
// map that correspond to the Rect
function GetRectWeight(Weights, Rect) {
  let W = 0;
  for (let dx = 0; dx < Rect.w; dx++) {
    for (let dy = 0; dy < Rect.h; dy++) {
      W += Weights[(Rect.x + dx) % KMap.Width][(Rect.y + dy) % KMap.Height];
    }
  }
  return W;
}

// Used for the array sorting function to sort objects by each object's .Weight member
function SortByWeight(a, b) {
  if (a.Weight < b.Weight) return -1;
  else if (a.Weight > b.Weight) return 1;
  else return 0;
}

// Returns true if two Rects overlap (share any squares)
function OverlappingRects(R1, R2) {
  if (R1.x + R1.w > R2.x && R2.x + R2.w > R1.x && R1.y + R1.h > R2.y && R2.y + R2.h > R1.y)
    return true;
  return false;
}

// Sorts a list of Rects that cover squares of the KMap, and returns a minimal
// subset of those Rects that cover the same squares
function FindBestCoverage(Rects, AllRects) {
  // create a 'Weight' map
  let Weights = new Array();
  for (let w = 0; w < KMap.Width; w++) {
    Weights[w] = new Array();
    for (let h = 0; h < KMap.Height; h++) {
      // initial weight is 0 if not already covered, high if already covered
      Weights[w][h] = KMap[w][h].Covered ? Heavy : 0;
    }
  }
  // seed the weight map with 1 for every square covered by every Rect
  for (let i = 0; i < Rects.length; i++) {
    AddRectWeight(Weights, Rects[i], 1);
  }

  // generate a set of rects sorted by weight - but  after selecting each minimal
  // weighted rect, re-weight the map for the next selection.  Re-weight by
  // making the squares of the selected Rect very heavy, but reduce the
  // weight of any squares for Rects that overlap the selected Rect.  This has the
  // effect of pushing the rects that duplicate KMap coverage to the back of the list,
  // while bubbling non-overlapping maximal covering rects to the front.
  let SortedRects = new Array();
  while (Rects.length > 0) {
    for (let j = 0; j < Rects.length; j++) {
      // get the weight for the remaining Rects
      Rects[j].Weight = GetRectWeight(Weights, Rects[j]);
    }
    // Sort the array to find a Rect with minimal weight
    Rects.sort(SortByWeight);
    SortedRects.push(Rects[0]);
    if (Rects.length == 1) {
      // just found the last Rect, break out
      break;
    }
    // Make the weight map very heavy for the selected Rect's squares
    AddRectWeight(Weights, Rects[0], Heavy);

    // Reduce the weight for Rects that overlap the selected Rect
    for (let j = 0; j < Rects.length; j++) {
      if (OverlappingRects(Rects[0], Rects[j])) {
        AddRectWeight(Weights, Rects[j], -1);
      }
    }
    // continue processing with all the Rects but the first one
    Rects = Rects.slice(1);
  }

  // determine which of the sorted array of Rects are actually needed
  TryRects(SortedRects, AllRects);
}

//Finds the minimized equation for the current KMap.
function Search() {
  let Rects = new Array();
  Cover(CreateRect(0, 0, KMap.Width, KMap.Height), false);

  // Find the (larger) rectangles that cover just the quares in the KMap
  //  and search for smaller and smaller rects
  SearchRect(4, 4, true, Rects, true);
  SearchRect(4, 2, true, Rects, true);
  SearchRect(2, 4, true, Rects, true);
  SearchRect(1, 4, true, Rects, true);
  SearchRect(4, 1, true, Rects, true);
  SearchRect(2, 2, true, Rects, true);

  // 2x1 sized rects  - These have to be handled specially in order to find a
  //  minimized solution.
  let Rects2x1 = new Array();
  SearchRect(2, 1, true, Rects2x1, false);
  SearchRect(1, 2, true, Rects2x1, false);
  FindBestCoverage(Rects2x1, Rects);

  // add the 1x1 rects
  SearchRect(1, 1, true, Rects, true);

  //check to see if any sets of (necessary) smaller rects fully cover larger ones (if so, the larger one is no longer needed)
  Cover(CreateRect(0, 0, KMap.Width, KMap.Height), false);
  for (let i = Rects.length - 1; i >= 0; i--) {
    if (IsCovered(Rects[i])) {
      Rects[i] = null;
    } else {
      Cover(Rects[i], true);
    }
  }

  ClearEquation();
  for (let i = 0; i < Rects.length; i++) {
    if (Rects[i] != null) {
      RectToEquation(Rects[i]);
    }
  }
  if (Equation.UsedLength == 0) {
    Equation.UsedLength = 1;
    Equation[0].Expression = '0';
    Equation[0].Rect = CreateRect(0, 0, KMap.Width, KMap.Height);
  }
}

function ClearEquation() {
  for (let i = 0; i < Equation.length; i++) {
    Equation[i].Rect = null;
  }
  Equation.UsedLength = 0;
}

// returns true if the rect is entirely within a singel given variable
function IsConstantVariable(Rect, Variable) {
  let topleft = KMap[Rect.x][Rect.y].Variable[Variable];
  for (let dx = 0; dx < Rect.w; dx++) {
    for (let dy = 0; dy < Rect.h; dy++) {
      test = KMap[(Rect.x + dx) % KMap.Width][(Rect.y + dy) % KMap.Height].Variable[Variable];
      if (test != topleft) {
        return false;
      }
    }
  }
  return true;
}

// Turns a rectangle into a text minterm (in HTML)
function RectToEquation(Rect) {
  let Text = '';
  for (let i = 0; i < VariableCount; i++) {
    if (IsConstantVariable(Rect, i)) {
      //	Text += VariableNames[i];
      //	if (!KMap[Rect.x][Rect.y].Variable[i])
      //	{
      //		Text += "'";
      //	}
      if (!KMap[Rect.x][Rect.y].Variable[i]) {
        Text += "<span style='text-decoration: overline'>" + VariableNames[i] + '</span> ';
      } else {
        Text += VariableNames[i] + ' ';
      }
    }
  }
  if (Text.length == 0) {
    Text = '1';
  }
  Equation[Equation.UsedLength].Rect = Rect;
  Equation[Equation.UsedLength].Expression = Text;
  Equation.UsedLength++;

  return Text;
}

// turns a boolean into a display value  true->"1"  false->"0"
function DisplayValue(bool) {
  if (bool == true) {
    return '1';
  } else if (bool == false) {
    return '0';
  } else return DontCare;
}

// Turns a number into binary in text (prepends 0's to length 'bits')
function BinaryString(value, bits) {
  let str = value.toString(2);
  for (let i = 0; i < bits; i++) {
    if (str.length < bits) {
      str = '0' + str;
    }
  }
  return str;
}

// redraws UI (with no highlights)
function UpdateUI() {
  for (let i = 0; i < TruthTable.length; i++) {
    let Val = DisplayValue(TruthTable[i].KMapEntry.Value);
    //Truth Table

    SetValue(TruthTable[i].ButtonUIName, Val);
    SetBackgroundColor(TruthTable[i].ButtonUIName, HighlightColor(Val));
    SetBackgroundColor(TruthTable[i].TTROWUIName, HighlightColor(Val));

    //KMap
    SetValue(TruthTable[i].KMapEntry.ButtonUIName, Val);
    SetBackgroundColor(TruthTable[i].KMapEntry.ButtonUIName, HighlightColor(Val));
    SetBackgroundColor(TruthTable[i].KMapEntry.TDUIName, HighlightColor(Val));
  }
  SetInnerHTML('EquationDiv', GenerateEquationHTML());
}

function ToggleValue(Value) {
  if (AllowDontCare) {
    if (Value == true) {
      return DontCare;
    } else if (Value == DontCare) {
      return false;
    } else if (Value == false) {
      return true;
    }
  } else {
    return !Value;
  }
}

function ToggleTTEntry(TTEntry) {
  TTEntry.KMapEntry.Value = ToggleValue(TTEntry.KMapEntry.Value);
  RefreshUI();
}

function ToggleKMEntry(KMEntry) {
  KMEntry.Value = ToggleValue(KMEntry.Value);
  RefreshUI();
}

function RefreshUI() {
  ClearEquation();
  Search();
  UpdateUI();
}

// redraws UI with the given equation highlighted
function SetShowRect(EquationEntry, EquationIndex) {
  if (EquationEntry == null) {
    UpdateUI();
    return;
  } else {
    let ShowRect = EquationEntry.Rect;

    for (let dx = 0; dx < ShowRect.w; dx++) {
      for (let dy = 0; dy < ShowRect.h; dy++) {
        let KMEntry = KMap[(ShowRect.x + dx) % KMap.Width][(ShowRect.y + dy) % KMap.Height];
        let Val = DisplayValue(TruthTable[i].KMapEntry.Value);
        //KMap
        SetBackgroundColor(KMEntry.ButtonUIName, RectHighlightColor(Val));
        SetBackgroundColor(KMEntry.TDUIName, RectHighlightColor(Val));
        //Truth Table
        SetBackgroundColor(KMEntry.TruthTableEntry.ButtonUIName, RectHighlightColor(Val));
        SetBackgroundColor(KMEntry.TruthTableEntry.TTROWUIName, RectHighlightColor(Val));
      }
    }
  }
  SetBackgroundColor(Equation[EquationIndex].ButtonUIName, EquationHighlightColor);
}

function GetElement(Name) {
  if (document.getElementById) {
    return document.getElementById(Name);
  } else if (document.all) {
    return document.all[Name];
  } else if (document.layers) {
    return document.layers[Name]; //not sure this works in all browsers... element.style would be document.layers[Name];
  }
}

function SetInnerHTML(Name, Text) {
  GetElement(Name).innerHTML = Text;
  document.querySelectorAll('.blue.button').forEach(function(element, index) {
    (function(i) {
      element.addEventListener('click', function() {
        if (!hasClass(this, 'clicked')) {
          this.classList.add('clicked');
          SetShowRect(Equation[i], i);
        } else {
          this.classList.remove('clicked');
          SetShowRect(null);
        }
      });
    })(index);
  });
}

function SetBackgroundColor(Name, Color) {
  GetElement(Name).style.backgroundColor = Color;
}

function SetValue(Name, Value) {
  GetElement(Name).value = Value;
}

function GenerateTruthTableHTML() {
  let Text = '<table ID="TruthTableID" style="text-align:center">';
  {
    let count;
    let color;

    Text = Text + '<thead style="background: rgb(49,60,78);text-align:center"><tr>';
    for (let i = 0; i < VariableCount; i++) {
      Text = Text + '<th>' + VariableNames[i] + '</th>';
    }
    Text = Text + '<th>' + FunctionText + '</th></tr></thead>';

    for (let i = 0; i < TruthTable.length; i++) {
      if (i % 2 == 0) {
        count = 0.85;
      } else {
        count = 0.8;
      }

      Text += "<tr ID='" + TruthTable[i].TTROWUIName + '\' style="opacity: ' + count + '">';
      for (let j = 0; j < VariableCount; j++) {
        if (DisplayValue(TruthTable[i][j].Variable) == 1) {
          color = 'style="background-color: rgba(255,255,255,.3);font-weight: bold"';
        } else {
          color = '';
        }

        Text = Text + '<td ' + color + '>' + DisplayValue(TruthTable[i][j].Variable) + '</td>';
      }
      Text =
        Text +
        '<td><input class="remove-bottom full-width" ID="' +
        TruthTable[i].ButtonUIName +
        '" name=' +
        TruthTable[i].ButtonUIName +
        " type='button' value='" +
        DisplayValue(TruthTable[i].KMapEntry.Value) +
        '\' onClick="ToggleTTEntry(TruthTable[' +
        i +
        '])" ></td>' +
        '</tr>';
    }
  }
  Text = Text + '</table>';
  return Text;
}

function GenerateKarnoMapHTML() {
  let Text = '<table><thead><tr>';
  let h, w;
  let count;

  Text =
    Text +
    '<th colspan="2" ></th><th style="background: rgb(49,60,78);border-bottom:2px solid rgb(31, 39, 55)" colspan=' +
    KMap.Width +
    '>';

  for (let i = 0; i < KMap.XVariables; i++) {
    Text += VariableNames[i];
  }

  Text += '</th></tr></thead>';
  Text += '<tbody><tr>';
  Text += '<th ></th><th style="border-left: none !important"></th>';

  for (let i = 0; i < KMap.Width; i++) {
    Text +=
      '<th class="header-color" style="background: rgb(49,60,78)">' +
      BinaryString(BitOrder[i], KMap.XVariables) +
      '</th>';
  }
  Text += '</tr>';

  for (h = 0; h < KMap.Height; h++) {
    if (h % 2 != 0) {
      count = 0.85;
    } else {
      count = 0.8;
    }
    Text = Text + '<tr style="opacity:' + count + '">';
    if (h == 0) {
      Text +=
        '<th style="background: rgb(49,60,78); width: 15%" rowspan=' + (KMap.Height + 2) + '>';
      for (i = 0; i < KMap.YVariables; i++) {
        Text += '<b class="header-color">' + VariableNames[i + KMap.XVariables] + '</b>';
      }
    }
    Text +=
      '<th class="header-color" style="border-left: 2px solid rgb(31, 39, 55);background: rgb(49,60,78);width: 15%" >' +
      BinaryString(BitOrder[h], KMap.YVariables) +
      '</th>';

    for (w = 0; w < KMap.Width; w++) {
      Text +=
        "<td  ID='" +
        KMap[w][h].TDUIName +
        "' style='text-align:center;'>" +
        '<input class="remove-bottom full-width" ID=' +
        KMap[w][h].ButtonUIName +
        ' name=' +
        KMap[w][h].ButtonUIName +
        " type='button'  value='" +
        DisplayValue(KMap[w][h].Value) +
        '\' onClick="ToggleKMEntry(KMap[' +
        w +
        '][' +
        h +
        '])">' +
        '</td>';
    }
    Text += '</tr>';
  }
  Text += '</td></tr></tbody></table>';
  return Text;
}

function GenerateEquationHTML() {
  let Text = '<p class="header-color remove-bottom">';
  for (let i = 0; i < Equation.UsedLength; ) {
    for (let j = 0; j < 8 && i < Equation.UsedLength; j++) {
      if (i == 0) Text += '<b>' + FunctionText + ' = ';
      Text +=
        '<span class="blue button half-bottom" id="' +
        Equation[i].ButtonUIName +
        '" onclick="SetShowRect(Equation[' +
        i +
        '],' +
        i +
        ');" style="padding:5px">';
      Text += '<b>' + Equation[i].Expression + '</span>';
      if (i < Equation.UsedLength - 1) Text += ' <span> + </span>';
      i++;
    }
    Text += '</p>';
  }
  return Text;
}
function hasClass(element, cls) {
  return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
}

//input'a sadece A,B,C,D,!,(,),+ girilmesi
document.addEventListener('input', function() {
  if (document.getElementById('equation').value.length > 0) {
    let pattern = /(A|a|B|b|C|c|D|d|\!|\+|\(|\))/g;
    let matched = document.getElementById('equation').value.match(pattern);
    if (matched && matched[0]) {
      document.getElementById('equation').value = matched.join('');
    }
  }
});
function ChangeVariableNumber(Num) {
  InitializeTables(Num);
  ClearEquation();
  SetInnerHTML('TruthTableDiv', GenerateTruthTableHTML());
  SetInnerHTML('KarnoMapDiv', GenerateKarnoMapHTML());
  SetInnerHTML('EquationDiv', GenerateEquationHTML());
  GetElement('TwoVariableRB').checked = Num == 2 ? true : false;
  GetElement('ThreeVariableRB').checked = Num == 3 ? true : false;
  GetElement('FourVariableRB').checked = Num == 4 ? true : false;
  Search();
  UpdateUI();
}

function ToggleDontCare() {
  AllowDontCare = !AllowDontCare;
  for (let i = 0; i < TruthTable.length; i++) {
    if (TruthTable[i].KMapEntry.Value == DontCare) {
      TruthTable[i].KMapEntry.Value = false;
    }
  }
  ChangeVariableNumber(VariableCount);
  GetElement('AllowDontCareCB').checked = AllowDontCare;
}

function PageParameter(Name) {
  let Regex = new RegExp('[\\?&]' + Name + '=([^&#]*)');
  console.log(Regex);
  console.log(new Date().getTime());
  console.log(window.location.href);
  let Results = Regex.exec(window.location.href);
  console.log(Results);

  //linkin içinde Variables ya da DontCare var mı diye kontrol edip var ise onun değerini işaretliyor(radiobutton)
  if (Results != null) {
    return Results[1];
  }
  return '';
}
