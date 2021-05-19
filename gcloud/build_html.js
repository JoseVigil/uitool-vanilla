    
    module.exports = {        
        buildPreview: function (title, nombre, mensaje, contacto, image) {
            //let _style = buildStyle();
            //let _body = buildBody(nombre, mensaje, contacto);
            const string = '<!DOCTYPE html><head>' +          
            '<meta property="og:title" content="' + nombre + '">' +                    
            '<meta property="og:image" content="data:image/jpeg;base64,' + image + '"/>' +
            '<title>' + title + '</title>' +
            //'<link rel="icon" href="https://noti.ms/favicon.png">' +
            '<style>' + _style  + '</style>' +
            '</head><body>' + _body + '</body></html>';
            return string;
        }       
    };      

    function buildStyle() {
        return `* {
            box-sizing: border-box;
        }
        body {
            margin: 0;
        }
        .row{
            display:flex;
            justify-content:flex-start;
            align-items:stretch;
            flex-wrap:nowrap;
            padding:10px;
        }
        .cell{
            min-height:75px;
            flex-grow:1;
            flex-basis:100%;
        }
        @keyframes fadeEffect{
        from{
            opacity:0;
        }
        to{
            opacity:1;
        }
        }
        @media (max-width: 768px){
        .row{
            flex-wrap:wrap;
        }
        }
        @media (max-width: 480px){
        #ilb5{
            padding:10px;
        }
        #imqo{
            padding:10px;
        }
        #id2l{
            height:304px;
        }
        #ihrf{
            padding:10px;
        }
        #iz57{
            height:160px;
        }
        #i0c54{
            padding:10px;
            text-align:center;
            flex-direction:row;
            align-items:stretch;
            align-self:stretch;
        }
        #ir53b{
            padding:10px;
            text-align:center;
        }
        #i7sk2{
            padding:10px;
            text-align:center;
        }
        #i5olf{
            height:35px;
        }}`;
    }  

    function buildBody(nombre, mensaje, contacto) {
        return `<div class="row" id="id2l">
            <div class="cell" id="i8fz">
            <div id="ilb5">${nombre}
            </div>
            <div id="imqo">${mensaje}
            </div>
            <div id="ihrf">${contacto}
            </div>
            <div class="row" id="i5olf">
            </div>
            <div class="row" id="iz57">
                <div class="cell" id="iek0w">
                <div id="i0c54">Llamar ${contacto}
                </div>
                <div id="ir53b">Whatsapp
                </div>
                <div id="i7sk2">No soy esa persona
                </div>
                </div>
            </div>
            </div>
        </div>`;
    }

    
