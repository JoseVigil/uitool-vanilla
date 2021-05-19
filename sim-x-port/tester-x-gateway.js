  
  //http://www.objgen.com/json/models/Z56v  
  //https://developer.mozilla.org/es/docs/Web/JavaScript/Referencia/Objetos_globales/JSON  
  
  //https://stackoverflow.com/questions/60085584/google-script-to-fill-out-html-form
  //https://github.com/tomcam/appscripting/tree/master/docs/code/spreadsheet-sidebar1
  //DriveApp.createFile("TEST_REMOVE",_clean);  
  
  var _data = {};
  var _hdata = {};

  var _channels = ["A","B","C","D"]; 
  
  var _jsonData = "{\"gateways\":{\"S1\":{\"number\":1,\"gateway\":\"S1\",\"position\":6,\"ports\":{}},\"S2\":{\"number\":2,\"gateway\":\"S2\",\"position\":13,\"ports\":{}},\"S3\":{\"number\":3,\"gateway\":\"S3\",\"position\":20,\"ports\":{}},\"S5\":{\"number\":5,\"gateway\":\"S5\",\"position\":27,\"ports\":{}},\"S6\":{\"number\":6,\"name\":\"S6\",\"position\":34,\"ports\":{}},\"S8\":{\"number\":8,\"name\":\"S8\",\"position\":41,\"ports\":{}},\"S9\":{\"number\":9,\"name\":\"S9\",\"position\":54,\"ports\":{}},\"S10\":{\"number\":10,\"name\":\"S10\",\"position\":67,\"ports\":{}},\"S11\":{\"number\":11,\"name\":\"S11\",\"position\":80,\"ports\":{}},\"S12\":{\"number\":12,\"name\":\"S12\",\"position\":93,\"ports\":{}},\"S13\":{\"number\":13,\"name\":\"S13\",\"position\":106,\"ports\":{}},\"S14\":{\"number\":14,\"name\":\"S14\",\"position\":119,\"ports\":{}}},\"urls\":{\"url_base\":\"http://s\",\"url_domain\":\".notimation.com\",\"url_consumption\":\"/en/10-6SMSManagement.php\",\"url_sims\":\"/en/5-9SIM.php\",\"url_send\":\"/en/5-3-2SMSsend.php?ch\",\"url_switch\":\"/en/5-9-2SIMSwitch.php\"}}";
  var _heightlightData = "{\"heighlihgt\":{}}";

  var _params = {
    "method":"GET",
    "headers": { 
      "Authorization" : "Basic " + Utilities.base64Encode("admin" + ':' + "Notimation2020")
    }
  };
  
  function onOpen(e) {
     var ui = SpreadsheetApp.getUi();
      ui.createMenu('Notimation')
      //.addItem('Actualizar todos', 'getGatewayData')   
      //.addSeparator()
      .addSubMenu(ui.createMenu('Actualizar gateway')      
      .addItem('TEST',  'test')
      .addItem('S1',  'getS1')
      .addItem('S2',  'getS2')
      .addItem('S3',  'getS3')      
      .addItem('S5',  'getS5')
      .addItem('S6',  'getS6')      
      .addItem('S8',  'getS8')
      .addItem('S9',  'getS9')      
      .addItem('S10', 'getS10')
      .addItem('S11', 'getS11')
      .addItem('S12', 'getS12')    
      .addItem('S13', 'getS13')  
      .addItem('S14', 'getS14'))  
      .addSeparator()
      .addItem('VER DETALLE DE SIM', 'openSidebar')
      .addToUi();
    getGatewayData();
  }

  function onInstall(e) {
    onOpen(e);
  }

function getSwitchInfo(nProt, nSimNO)
{
  var szSimNO, str, info;	
	
  if(nSimNO == 0)			szSimNO = "A";
	else if(nSimNO == 1)	szSimNO = "B";
	else if(nSimNO == 2)	szSimNO = "C";
	else if(nSimNO == 3)	szSimNO = "D";
    
  info = nProt + ":" + nSimNO;	
  
  return info;
	
}

function activityLog(activity) {
  // For obtaining the current time
  var d = new Date();
  // This is a single call that obtains
  // the spreadsheet being used at the moment.
  // You pass an array of any size to appendRow(),
  // and it adds a row to the end of the spreadsheet
  // with each element of the array in an adjacent cell.
  SpreadsheetApp.getActiveSpreadsheet()
  .getSheets()[0]
  .appendRow([d.toLocaleTimeString(), activity])
 }


function openSidebar() {
  
  let ss  = SpreadsheetApp.getActiveSpreadsheet();
  let s   = ss.getSheetByName("SIMs por equipo");
  let row = s.getActiveCell().getRow();
  let col = s.getActiveCell().getColumn();  
  let sel = s.getRange(row, col).getValue();
  
  if (sel == 0) {
    
    var html = HtmlService.createHtmlOutputFromFile('dialog')
      .setWidth(200)
      .setHeight(100);    
    SpreadsheetApp.getUi() 
      .showModalDialog(html, 'Seleccion');
    
  } else  {
    
    let spl = sel.split("\n");          
    let coords = spl[2].split("-");
    
    let g = coords[0];
    let p = coords[1];
    let c = coords[2]; 
    
    let jr = s.getRange(300, 1).getValue(); 
    
    let data = JSON.parse(jr); 
    
    let using = data.gateways[g].ports[p][c].using;    
    let usage = data.gateways[g].ports[p][c].usage;    
    
    let number = data.gateways[g].number;    
    
    let _d = JSON.stringify(data);      
    
    let _link = data.urls.url_base + number + data.urls.url_domain + data.urls.url_send + p;  
    
    let _link_text = g + "_" + p + "_" + "_" + c;
    
    let url_sims = data.urls.url_base + g + data.urls.url_domain + _link;             
    
    let html_template = HtmlService.createTemplateFromFile('index');//.evaluate().setTitle('Notimation SIM-X-PORT');
    html_template.phone = spl[0];
    html_template.gateway = g;
    html_template.port = p;
    html_template.card = c;  
    html_template.using = using;  
    html_template.usage = usage; 
    html_template.link = _link; 
    html_template.link_text = _link; 
    
    // evaluate the template
    var sidebar_html = html_template.evaluate();  
    SpreadsheetApp.getUi().showSidebar(sidebar_html);    
  }  
}

function getGatewayDataByName(num, gateway){ 
  
  //SIMS
  
  let _d = JSON.stringify(_params);
  
  let url_sims = _data.urls.url_base + num + _data.urls.url_domain + _data.urls.url_sims;             
  var simsResponse = UrlFetchApp.fetch(url_sims, _params);  
  let simsStatus = simsResponse.getResponseCode();
  
  if ( simsStatus == 200 ) {  
    
    let contSims = simsResponse.getContentText();       
    getPhones(contSims, gateway);      
    
  } else {      
    showDialogError(url);          
  }
  
  //COMSUMPTIONS
  
  let url_coms = _data.urls.url_base + num + _data.urls.url_domain + _data.urls.url_consumption;             
  var comsResponse = UrlFetchApp.fetch(url_coms, _params);  
  let comsStatus = simsResponse.getResponseCode();
  
  if ( simsStatus == 200 ) {   
    
    let contComs = comsResponse.getContentText();       
    let position = _data.gateways[gateway].position; 
    getConsumptions(contComs, gateway, position);     
    
  } else {      
    showDialogError(url);          
  }   
}

function getGatewayData() {   
    
    _data = JSON.parse(_jsonData);
    _hdata = JSON.parse(_heightlightData);
      
    for (var i in _data.gateways) { 

      let num = _data.gateways[i].number;           
      let gateway = _data.gateways[i].gateway;             
      
      getGatewayDataByName(num, gateway);
      
      renderSheetBy(gateway);
      
    }      
    //DriveApp.createFile("TEST_JSON",_d);          
    renderSheet();   
    
  }

  function getGatewayById(num) {  
    _data = JSON.parse(_jsonData);
    _hdata = JSON.parse(_heightlightData);
    let gateway = "S" + num;                   
    getGatewayDataByName(num, gateway);      
    renderSheetBy(gateway);       
  }

  function JumpToCell(gateway) {
    var s = SpreadsheetApp.getActiveSpreadsheet();    
    var tab = s.getSheetByName("SIMs por equipo");     
    let pos = _data.gateways[gateway].position;     
    tab.setActiveCell(tab.getRange(pos, 2));
  }
  
  function getConsumptions(content, gateway, position) {          
      
      var regBody = new RegExp("<body[^>]*>((.|[\n\r])*)<\/body>");
      var _body = regBody.exec(content);  
      
      _body = "<!DOCTYPE html [<!ENTITY nbsp \"&#160;\"> ]><html>" + _body + "</html>";      
      
      var xmlDoc = XmlService.parse(_body);
      var element = xmlDoc.getRootElement();   
      
      var form = element.getChild("form");
      var maindiv = form.getChild("div");
      
      var dmain = form.getChild("div");
      var dclearfix = dmain.getChild("div");
      var drelativemt20 = dclearfix.getChild("div");
      var dboxbox2box4 = drelativemt20.getChildren("div");    
      var dtable = dboxbox2box4[1].getChild("div");
      var table = dtable.getChild("table");     
      var tbody = table.getChild("tbody");     
      var rows = tbody.getChildren("tr"); 
      
      let c = rows.length;
      
      for (var i in rows) {       
        
        let port = rows[i].getChildren("td")[1].getValue().toString();        
        let cell = rows[i].getChildren("td")[4].getValue().toString();  
        
        let spl = cell.split("[");        
        let a = parseInt(spl[1].split("]")[0]);
        let b = parseInt(spl[2].split("]")[0]);
        let c = parseInt(spl[3].split("]")[0]);
        let d = parseInt(spl[4].split("]")[0]);       
        
        _data.gateways[gateway].ports[port]["A"]["usage"] = a;
        _data.gateways[gateway].ports[port]["B"]["usage"] = b;
        _data.gateways[gateway].ports[port]["C"]["usage"] = c;
        _data.gateways[gateway].ports[port]["D"]["usage"] = d;   
       
      } 
  }
  
  function renderSheetBy(g) {   

    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getActiveSheet();  
    
    var count = 0;
    
    //for (var g in _data.gateways) {   
    
      //let _d = JSON.stringify(_data.gateways["S1"]);      
          
      let ports_length = Object.keys(_data.gateways[g].ports).length;;    
      
      let position = _data.gateways[g].position;    
      
      let f_row_num = position;
      let f_row_original = f_row_num; 
      let f_col_num = 2;
      let f_col_original = f_col_num;                
      
      for (var p in _data.gateways[g].ports) {                  
          
          for (var j in _channels) { 
          
            let card = _channels[j];
            
            if (ports_length==32) {            
              if (p==17 && j==0) {
                f_row_num = position - 6;
                f_col_num = 2;
                f_row_original = f_row_num; 
              }          
            }  
            
            let usage = _data.gateways[g].ports[p][card].usage;
            let using = _data.gateways[g].ports[p][card].using;
            
            let color = getColorByValue(usage);         
            var range = sheet.getRange(f_row_num, f_col_num);        
            range.setBackground(color);           
            range.setHorizontalAlignment("center");                             
            
            if (color=="yellow") {
              range.setFontColor("black");         
            } else {
              range.setFontColor("white");         
            }         
            
            let phone = _data.gateways[g].ports[p][card].phone;               
            if (usage==0) {
              usage = "";
            }            
            if (phone=="---") {
              phone = "----------";
            }          
            
            let record = g + "-" + p + "-" + card;
            
            let value = phone + "\n" + usage + "\n" + record;          
            range.setValue(value);              
            range.clearNote();  
            
            range.setBorder(false, false, false, false, false, false, "black", SpreadsheetApp.BorderStyle.SOLID);           
            
            if (using) {              
              let usingData = {"row":f_row_num,"col":f_col_num};
              let json_heigh = {};
              json_heigh[g + "_" + count + "_" + p] = usingData;              
              Object.assign(_hdata.heighlihgt, json_heigh);                              
            }          
                        
            f_row_num++;               
            count++;
          }                
          
          f_row_num = f_row_original;               
          f_col_num++;          
          
        }
    //}     
    
    //SACAR ESTO
    let jsonRange = sheet.getRange(300, 1);   
    jsonRange.setValue(JSON.stringify(_data)); 
    
     let _d = JSON.stringify(_hdata);  
    
    //Borders Using     
    for (var h in _hdata.heighlihgt) {          
      let row = _hdata.heighlihgt[h].row;
      let col = _hdata.heighlihgt[h].col;     
      var range = sheet.getRange(row, col);          
      range.setBorder(true, true, true, true, true, true, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);      
    }
    
  }   
  
  function getPhones(content, gateway) {     
      
      var regBody = new RegExp("<body>[^>]*>((.|[\n\r])*)<\/body>");
      var _body = regBody.exec(content);  
      
      let _body_ = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html>' + _body + '</html>';    
      let _replaced = _body_.replace(/<a>/g,'</a>');      
      let _clean = _replaced.replace(/<\/form>[\s\S]*?<\/html>/, '<\/form><\/body><\/html>');           
      
      let xmlDoc = XmlService.parse(_clean);
      let element = xmlDoc.getRootElement();   
      
      let bdy = element.getChild("body");    
      let form = bdy.getChild("form");       
      let table = form.getChild("table");         
      let tr = table.getChild("tr");
      let td = tr.getChild("td");
      let dvmain = td.getChild("div");
      let dclearfix = dvmain.getChild("div");    
      let drel = dclearfix.getChild("div");    
      let dbox = drel.getChildren("div");
      let dtable = dbox[1].getChild("div");
      let table_1 = dtable.getChild("table");
      let tbody = table_1.getChild("tbody");     
      let rows = tbody.getChildren("tr");
      
      for (var i in rows) { 
      
        let row = JSON.stringify(rows[i].getChildren("td"));
        
        let port = rows[i].getChildren("td")[0].getValue().toString();    
        
        let phone_1;
        let using_1 = rows[i].getChildren("td")[1].getValue().toString();       
        if (rows[i].getChildren("td")[2].getChild('font')!=null){
          phone_1 = rows[i].getChildren("td")[2].getChild('font').getText(); 
        } else {
          phone_1 = rows[i].getChildren("td")[2].getValue().toString();
        }           
        
        let phone_2;
        let using_2 = rows[i].getChildren("td")[3].getValue().toString();       
        if (rows[i].getChildren("td")[4].getChild('font')!=null){
          phone_2 = rows[i].getChildren("td")[4].getChild('font').getText(); 
        } else {
          phone_2 = rows[i].getChildren("td")[4].getValue().toString();
        }           
        
        let phone_3;
        let using_3 = rows[i].getChildren("td")[5].getValue().toString();       
        if (rows[i].getChildren("td")[6].getChild('font')!=null){
          phone_3 = rows[i].getChildren("td")[6].getChild('font').getText(); 
        } else {
          phone_3 = rows[i].getChildren("td")[6].getValue().toString();
        }
        
        let phone_4;
        let using_4 = rows[i].getChildren("td")[7].getValue().toString();       
        if (rows[i].getChildren("td")[8].getChild('font')!=null){
          phone_4 = rows[i].getChildren("td")[8].getChild('font').getText(); 
        } else {
          phone_4 = rows[i].getChildren("td")[8].getValue().toString();
        }    
        
        let _u1 = false;
        let _u2 = false;
        let _u3 = false;
        let _u4 = false;
        
        let _u = "Using";
        if (using_1==_u) {
            _u1 = true;        
        }        
        if (using_2==_u) {
            _u2 = true;        
        }        
        if (using_3==_u) {
            _u3 = true;        
        }        
        if (using_4==_u) {
            _u4 = true;        
        }
        
        let phoneData = {
          "A":{"using":_u1,"phone":phone_1},
          "B":{"using":_u2,"phone":phone_2},
          "C":{"using":_u3,"phone":phone_3},
          "D":{"using":_u4,"phone":phone_4},        
        };
        
        let json_port = {};
        json_port[port] = phoneData; 
        
        Object.assign(_data.gateways[gateway].ports, json_port);       
      }  
  } 
       
  function getColorByValue(value) {  
    var color;  
    if (value == 0) {
      color = "gray";
    } else if (value >= 5000) {        
      color = "#990000";  
    } else if (value >= 4500) {        
      color = "red";
    } else if ((value >= 3000) && (value <= 4500)) {    
      color = "yellow";
    } else if (value <= 3000) {        
      color = "green";
    }      
    return color;
  }
  
  function showDialogError(url) {
    var ui = SpreadsheetApp.getUi();
    var result = ui.alert(
      'Error de logueo',
      'No se puede acceder a ' + url,
      ui.ButtonSet.OK);        
  }
  

function getS1() {
  getGatewayById(1);
}

function getS2() {
  getGatewayById(2);
}

function getS3() {
  getGatewayById(3);
}

function getS4() {
  getGatewayById(4);
}

function getS5() {
  getGatewayById(5);
}

function getS6() {
  getGatewayById(6);
}

function getS8() {
  getGatewayById(8);
}

function getS9() {
  getGatewayById(9);
}

function getS10() {
  getGatewayById(10);
}

function getS11() {
  getGatewayById(11);
}

function getS12() {
  getGatewayById(12);
}

function getS13() {
  getGatewayById(13);
}

function getS14() {
  getGatewayById(14);
}











