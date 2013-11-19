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

/* global require, console*/
/* jslint node: true */
"use strict";

var lib = {
    //mail : require("./sendmail.js"),
    cuc: require('../lib/cuc.js'),
    grouping: require('../lib/grouping.js'),
    model: require('../lib/model.js'),
    db: require('../lib/db.js'),
    actions: require('../lib/actions.js'),
    enrollment: require('../lib/enrollmentData.js'),
};

/**
   FeliCaカード読み取りセッションクラス
*/
var Session = function (config, teacher_db, websocketServer, enrollment_filename) {
    this.config = config;
    this.websocketServer = websocketServer;
    this.enrollment = lib.enrollment.parse(enrollment_filename, {
        encoding: 'Shift-JIS',
        separator: ','
    });

    this.teacher_db = teacher_db;
    
    this.read_db = new lib.db.ReadStatusDB(this.config,
        this.config.READ_STATUS_FIELD_KEYS, function (id_code, first_date, last_date, student) {
            return new lib.model.ReadStatus(id_code, first_date, last_date, student);
        });

    this.actions = new lib.actions.Actions();

    if (this.config.GROUPING) {
        this.grouping = new lib.grouping.MemberGroups(this.config.NUM_GROUPS);
    }
};


Session.prototype.createReadStatusDatabase = function () {
    // 現在の日時をもとに該当する出席確認済み学生名簿を読み取り、データベースを初期化

    /*
     function (date, student) {
         onReadActions.onResumeLoadingStudent(date, student);
     }
    function (date, student) {
         onReadActions.onResumeLoadingNoMember(date, student);
     }
    */
};

Session.prototype.on_polling = function (pasori_index) {
    this.actions.on_polling(this.websocketServer, pasori_index);
};

Session.prototype.on_idle = function (pasori_index) {
    this.actions.on_idle(this.websocketServer, pasori_index);
};

Session.prototype.on_read_teacher_card = function (pasori_index, teacher) {

    // 現在時刻を取得
    console.log("teacher:" + teacher.id_code);
    var now = new Date();
    var read_status = new lib.model.ReadStatus(teacher.id_code, now, now, teacher);

    this.actions.on_adminConfig(this.websocketServer, pasori_index, read_status);

    return true;
};

Session.prototype.on_read_student_card = function (pasori_index, student) {

    /*
    if (!this.lecture_db.lecture_id_map[lecture_id]) {
        // 現在の出欠確認対象科目を設定できなかった場合
        console.log("UNDEFINED LECTURE:" + lecture_id + " in " + Object.keys(this.lecture_db.id_code_map).length + " definitions.");
        return false;
    }

    if (!this.enrollment_db[lecture_id]) {
        // 現在の出欠確認対象科目の履修者を設定できなかった場合
        console.log("NO MEMBER LECTURE:" + lecture_id + " in " + Object.keys(this.member_db).length + " definitions.");
        return false;
    }

    if (!this.member_db[lecture_id][id_code]) {
        // その学生が現在の出欠確認対象科目の履修者ではない場合
        console.log("INVALID ATTENDEE :" + id_code + " of " + lecture_id + "(" + Object.keys(this.member_db[lecture_id]).length + " members)");
        return false;
    }
    */

    var read_status = this.read_db.get(student.id_code);
    var now = new Date();

    if (read_status) {
        // 読み取り済みの場合
        if (now.getTime() < read_status.lasttime.getTime() + this.config.APP.PASORI_SAME_CARD_READ_IGNORE) {
            // 読み取り済み後3秒以内の場合は、何もしない
            this.actions.on_continuous_read(this.websocketServer, pasori_index, read_status);
        } else {
            // すでに読み取り済みであることを警告
            // 読み取り状況オブジェクトを更新
            read_status.lasttime = now;
            // 読み取り状況オブジェクトを登録
            this.read_db.store(read_status, student);
            this.actions.on_notice_ignorance(this.websocketServer, pasori_index, read_status);
        }
    } else {
        // 読み取り済みではなかった＝新規の読み取りの場合

        if (this.grouping) {
            var groupIndex = this.grouping.chooseRandomCandidateGroupIndex();
            this.grouping.addGroupMember(groupIndex, student.id_code);
            student.group_id = groupIndex + 1;

            try {
                var to = lib.cuc.id2logname(student.id_code) + '@cuc.ac.jp';
                if ('000727' == student.id_code) {
                    to = 'hiroya@cuc.ac.jp';
                }
                /*
                mail.send_mail(to, 
                               lecture, lecture.teachers,
                               now.getFullYear(), now.getMonth()+1, now.getDate(),
                               now.getWday(), now.getAcademicTime(),
                               "あなたの班は"+student.group_id+"班です．");
                */
            } catch (e) {
                console.log(e);
            }
        }

        // 読み取り状況オブジェクトを作成
        read_status = new lib.model.ReadStatus(student.id_code, now, now, student);
        // 読み取り状況オブジェクトを登録
        this.read_db.store(read_status, student);
        this.actions.on_attend(this.websocketServer, pasori_index, read_status);
    }

    return true;
};

Session.prototype.on_read_error = function (websocketServer, pasori_index, data) {
    // 学生名簿または教員名簿上にIDが存在しない場合
    var now = new Date();

    var read_status = this.read_db.get_error(data);

    if (read_status) {
        // 読み取り済みの場合
        if (now.getTime() < read_status.lasttime.getTime() + this.config.FELICA.READ_DELAY) {
            // 読み取り済み後3秒以内の場合は、何もしない
        } else {
            // すでに読み取り済みであることを警告
            // 読み取り状況オブジェクトを更新
            read_status.lasttime = now;
            // 読み取り状況オブジェクトを登録
            this.read_db.store_error_card(read_status);
            this.actions.on_error_card(websocketServer, pasori_index, read_status);
        }
    } else {
        read_status = new lib.model.ReadStatus(data, now, now, {});
        this.actions.on_error_card(websocketServer, pasori_index, read_status);
        this.read_db.store_error_card(read_status);
    }
};

// 実際の読み取り処理への分岐
Session.prototype.on_read = function (pasori_index, id_code, lecture, check_teacher_idcard) {
    var teacher = this.teacher_db[id_code];
    var student = this.enrollment.student_db[id_code];

    if (check_teacher_idcard) {

        if (teacher && this.on_read_teacher_card(pasori_index, teacher)) {
            return;
        } else if (student && this.on_read_student_card(pasori_index, student, lecture)) {
            return;
        }
    } else {
        if (this.on_read_student_card(pasori_index, student, lecture)) {
            return;
        } else if (this.on_read_teacher_card(pasori_index, teacher)) {
            return;
        }
    }

    this.on_read_error(pasori_index, id_code, lecture);
};


Session.prototype.initClientView = function (socket) {
    var message = {
        'command': 'onStartUp',
        'lecture': this.enrollment.lecture,
        'num_students': (this.enrollment.student_db) ? Object.keys(this.enrollment.student_db).length : 0
    };
    if (socket) {
        // update console
        socket.send(JSON.stringify(message));
    } else {
        this.actions.send(this.websocketServer, message);
    }

};

exports.Session = Session;