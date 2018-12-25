addEventListener("load", initAll, false);

function initAll() {
    $.ajax({
        type: "GET",
        url: "http://" + window.location.host  + ":1089/loadbgp",
        dataType: "json",
        success: ReceiveBGP,
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            //处理错误的地方
        }
    });

    function ReceiveBGP(jsonData) {
        
        $(divBG).css("background-image","url(" +jsonData.strBPGURL +")");

    };




};

function IsPressEnter(evt) {
    if (evt) {
        var thisKeyCode = evt.keyCode;
        var thisElement = evt.target;
    }
    else {
        var thisKeyCode = window.event.keyCode;
        var thisElement = window.event.srcElement;
    };
    if (thisKeyCode == 13 || evt.type == "click") {
        var objSEKeyword = document.getElementsByClassName("WantKW");
        var strSEKeyword = thisElement.value;
        if (evt.type == "click") {
            strSEKeyword = objSEKeyword[0].value;
        };
        window.location = "./search.html?kw=" + encodeURI(strSEKeyword)+"&bd=false";


        if (evt) {
            evt.preventDefault();
        }
        else {
            window.event.returnValue = false;
        };

    };
};
