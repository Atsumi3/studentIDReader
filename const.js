/* アプリケーション固有の設定 */
exports.APP = {
    HAVE_PASORI : true,
    AUTO_LAUNCH_BROWSER : true,
    CATCH_SIGINT : false,

    ETC_DIRECTORY : 'etc', //学生名簿ファイルの読み出し元ディレクトリ
    READ_STATUS_FILE_EXTENTION : 'csv.txt',
    READ_ERRROR_FILE_EXTENTION : 'error.csv.txt',
    VAR_DIRECTORY : 'var', //学生名簿ファイルの読み取り結果ファイルの保存先ディレクトリ
    FIELD_SEPARATOR : ',',
    ENCODING : 'UTF-8'
};

/* ネットワークの設定 */
exports.NET = {
    HTTP_PORT : 8888,
    WS_PORT : 8889
};

/* システム環境の設定 */
exports.ENV = {
    ENCODING : 'utf-8',
    PATH_SEPARATOR : '/',
};

/* PaSoRiの設定 */
exports.PASORI = {
    TIMEOUT : 150
};

/* FeliCaの設定 */
exports.FELICA = {
    POLLING_TIMESLOT : 0,
    SYSTEM_CODE: {
        ANY : 0xFFFF,
        FELICA_LITE : 0x88B4
    },
    READ_DELAY: 3000
};

/* 学生証リーダーの設定 */
exports.CARDREADER = {
    SERVICE_CODE : 0x000B,
    CHECK_ORDER_TEACHER_STUDENT: false,
    ID_INFO:{
        BLOCK_NUM : 0x8004,
        PREFIX : '01',
        BEGIN_AT : 2,
        END_AT : 9
    }
};
