/*
  FeliCa Student ID card reader to check attendee
  Copyright (c) 2013 Hiroya Kubo <hiroya@cuc.ac.jp>
   
  Permission is hereby granted, free of charge, to any person obtaining
  a copy of this software and associated documentation files (the
  "Software"), to deal in the Software without restriction, including
  without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to
  the following conditions:
  
  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.
  
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
/* jslint node: true */
"use strict";

var MESSAGE_ATTEND = "出席";
var MESSAGE_NO_USER = '履修者ではありません';
var MESSAGE_NO_MEMBER = '学内関係者ではありません';
var MESSAGE_CONTINUOUS_READ = '出席(継続読み取り)';
var MESSAGE_ALREADY_READ = '(処理済み)';
var MESSAGE_ADMIN_CONFIG = '教員(管理)';

var DEBUG = false;

/**
   FeliCa学生証読み取り時のアクション
*/
var UpdateView = {};

UpdateView.send = function (socket, object) {
    var data = JSON.stringify(object);
    if (socket && socket.authorized){
        socket.send(data);
    }else{
        //console.log("unauthorized -- dropped: "+data);
    }
}

UpdateView.sendAll = function (ws, object) {
    if (!ws || !ws.clients) {
        return;
    }

    ws.clients.forEach(
        function (clientSocket) {
            UpdateView.send(clientSocket, object);
        }
    );
};


/**
   教員カードを読み取った場合
*/
UpdateView.on_adminConfig = function (ws, deviceIndex, read_status) {

    if (DEBUG) {
        console.log("ADMIN: " + read_status.time.get_yyyymmdd_hhmmss());
    }

    var teacher = read_status.entry;

    UpdateView.sendAll(ws, {
        command: 'onAdminCardReading',
        time: read_status.time.getTime(),
        teacher_id: read_status.id,
        teacher: teacher,
        result: MESSAGE_ADMIN_CONFIG,
        deviceIndex: deviceIndex,
    });
};

/**
   学生名簿に学生データが存在し、かつ、
   学生証から学籍番号が読み取れた場合
*/
UpdateView.on_attend = function (ws, deviceIndex, read_status, student, group_id) {

    if (DEBUG) {
        console.log(read_status.time.get_yyyymmdd_hhmmss());
        console.log(MESSAGE_ATTEND + " " + student.id_code + " " + student.fullname);
    }

    UpdateView.sendAll(ws, {
        command: 'onRead',
        time: read_status.time.getTime(),
        id_code: read_status.id,
        student: student,
        group_id: group_id,
        result: MESSAGE_ATTEND,
        deviceIndex: deviceIndex,
        sound: true
    });

};

/**
   学生名簿に学生データが存在し、かつ、
   その学生証が以前の読み取りで読み取り済みの場合(読み取り済み注意を表示)
*/
UpdateView.on_notice_ignorance = function (ws, deviceIndex, read_status, student, group_id) {

    if (DEBUG) {
        console.log(read_status.time.get_yyyymmdd_hhmmss());
        console.log(MESSAGE_ALREADY_READ + " " + student.id_code + " " + student.fullname);
    }

    UpdateView.sendAll(ws, {
        command: 'onRead',
        time: read_status.time.getTime(),
        id_code: read_status.id,
        student: student,
        group_id: group_id,
        result: MESSAGE_ALREADY_READ,
        deviceIndex: deviceIndex,
        sound: true
    });
};

/**
   学生名簿に学生データが存在し、かつ、
   その学生証が直前の読み取りで読み取り済みの場合(何もしない)
*/
UpdateView.on_continuous_read = function (ws, deviceIndex, read_status) {
    if (DEBUG) {
        console.log(read_status.time.get_yyyymmdd_hhmmss() + " > " + new Date().get_yyyymmdd_hhmmss());
        console.log(MESSAGE_CONTINUOUS_READ + " " + read_status.id_code);
    }
};

/**
   学内関係者の名簿にデータが存在しない場合
*/
UpdateView.on_error = function (ws, deviceIndex, read_status) {
    if (DEBUG) {
        console.log(read_status.time.get_yyyymmdd_hhmmss());
    }

    UpdateView.sendAll(ws, {
        command: 'onRead',
        time: read_status.time.getTime(),
        id_code: read_status.id,
        result: MESSAGE_NO_USER,
        deviceIndex: deviceIndex,
        sound: true
    });
};

UpdateView.onResumeLoadingStudent = function (ws, date, student) {
    UpdateView.sendAll(ws, {
        command: 'onResume',
        time: date.getTime(),
        id_code: student.id_code,
        student: student,
        result: MESSAGE_ATTEND,
        sound: false
    });
};

UpdateView.onResumeLoadingNoMember = function (ws, date, student) {
    UpdateView.sendAll(ws, {
        command: 'onResume',
        time: date.getTime(),
        id_code: student.id_code,
        result: MESSAGE_NO_MEMBER,
        sound: false
    });
};

UpdateView.on_polling = function (ws, deviceIndex) {
    UpdateView.sendAll(ws, {
        command: 'onHeartBeat',
        deviceIndex: deviceIndex
    });
};

UpdateView.on_idle = function (ws, deviceIndex) {
    UpdateView.sendAll(ws, {
        command: 'onIdle',
        deviceIndex: deviceIndex
    });

    UpdateView.sendAll(ws, {
        command: 'onHeartBeat',
        deviceIndex: deviceIndex
    });    
};

UpdateView.on_startup = function (lecture, enrollment_db, read_status_list, grouping, websocketServer, socket) {

    var message = {
        'command': 'onStartUp',
        'lecture': lecture,
        'num_students': (enrollment_db) ? Object.keys(enrollment_db).length : 0,
        'enrollmentTable' : enrollment_db,
        'resumeEntryList': read_status_list.map(function(read_status){
                return {
                    command: 'onResume',
                    time: read_status.time.getTime(),
                    id_code: read_status.id_code,
                    group_id: grouping ? grouping.getGroupIndexOf(read_status.id_code) + 1 : undefined,
                    student: enrollment_db[read_status.id_code],
                    result: MESSAGE_ATTEND,
                    sound: false
                };
            })
    };

    if (socket) {
        UpdateView.send(socket, message);
    } else {
        // update all client views.
        UpdateView.sendAll(websocketServer, message);
    }
};

UpdateView.on_pasoriErrorMessage = function(ws){
    UpdateView.sendAll(ws, {
        'command': 'onPaSoRiError',
        'message': 'PaSoRi device is disabled.'
    });
};

exports.UpdateView = UpdateView;