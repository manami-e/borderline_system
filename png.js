//ロードされた際の処理として実施：
// window.onload = function () {
//     console.log("done");
//     console.log(document.getElementById("map"));

//     // document.getElementById("searchButton").onclick = function () {
//     //HTML内に画像を表示
//     html2canvas(document.getElementById("map"), {
//         onrendered: function (canvas) {
//             //imgタグのsrcの中に、html2canvasがレンダリングした画像を指定する。
//             var imgData = canvas.toDataURL();
//             document.getElementById("result").src = imgData;
//             console.log("done");
//         }
//     });

//     //ボタンを押下した際にダウンロードする画像を作る
//     html2canvas(document.body, {
//         onrendered: function (canvas) {
//             //aタグのhrefにキャプチャ画像のURLを設定
//             var imgData = canvas.toDataURL();
//             document.getElementById("ss").href = imgData;
//             console.log("done");
//         }
//     });
//     // };
// }

$('#capture').on('click', function(){
    var map = document.getElementById('map');
    var $canvas = $('#canvas');
    
    $canvas.attr('width', map.videoWidth);
    $canvas.attr('height', map.videoHeight);
    $canvas[0].getContext('2d').drawImage(map, 0, 0, $canvas.width(), $canvas.height());
  });

// function resetButton() {
    
// }