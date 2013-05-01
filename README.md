インストール
==========

1. node.jsをインストールする。

2. 以下を実行する。
    npm install fs
    npm install path
    npm install open
    npm install express
    npm install https
    npm install websocket.io
    npm install node-ffi

起動・運用
==========

PaSoRiをUSBポートに接続する。

var/students.csv を用意する。

Windows環境では、`studentIDReader.bat`をダブルクリックして起動する
(そのほかの環境では、コマンドプロンプトから`node studentIDReader.js`を実行する)。

起動後に、サーバが動作を開始し、さらに、規定のブラウザが開く。
学生証の読み取り結果が保存されている場合には、その状況が再現される。

サーバ側で学生証を読み取ると、ブラウザ上で読み取り結果の表示が更新されていく。
読み取り実行には、自動的に画面がスクロールし、読み取り状況に応じたサウンドを再生する。

test版では、ダミーの4人分の学生証が読み込まれる内容が実行された後、プロセスが終了する。


TODO
==========

* PaSoRiを用いてFeliCaLiteを実際に読み込むコードは未実装である。
　node-ffiを用いるなどして実装をする必要がある。
　特に、`cardReader.polling()`の関数内を修正することになる。

* 現状の実装はtest版の関数を実行するようになっている。
　本運用に対応するためには、`cardReader.test();`を、
　`cardReader.polling();`に書き換える必要がある。

* クライアント側では、起動時に、授業名・教員名・履修者数などの情報を表示できるように
　なっているが、サーバ側では、現在の実装では、ダミーとして固定の値を送信している。
　現在の曜日時限に対応した授業名を選んで表示できるようにするべきか、要検討。
　もしこれをやるなら、毎学期の運用準備として、
　その学期に開講される授業一覧のCSVファイルを用意するというタスクが発生する。
　この授業一覧のCSVファイルは、起動後にブラウザ上にDragAndDropすると読み込む形となるだろう。

* 履修者名簿のstudent.csvファイルは、現在は固定ファイル名のstudents.csvとなっている。
　しかしこれは本来、授業ごとに別々のものを用意して読み込ませる必要があるものなので、
　固定ファイル名となっているのは不便である。　ファイル名を`授業コード.csv` のようにすべき。
　また、起動時に、授業名・教員名・履修者数などの情報にもとづいて選択的に読みこませるべきかもしれない。
　そのときは、こうした履修者名簿csvファイルは授業一覧のCSVなどといっしょにまとめて
　ブラウザ上にDragAndDropすると読み込む形となるだろう。

* HTML/CSS/jQueryによる見た目・アニメーション、もっと格好良いものにしたい。
