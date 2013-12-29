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

// 同日の直前の読み取りを継続するかを確認する機能。日が改まる場合には、継続しない。

require('./lib/util/arrayUtil.js');
require('./lib/util/dateUtil.js');
var stringUtil = require("./lib/util/stringUtil.js");

var fs = require('fs');
var path = require('path');

var xlsx = require('node-xlsx');

var db = require('./lib/db.js');
var model = require('./lib/model.js');

var enrollment_dir = 'etc/2011Autumn';
var attendance_dir = 'var';
var SEPARATOR = ',';
var ATTEND_FILE_PREFIX = 'Attend-';

//var ATTEND_FILE_SUFFIX = '.csv.txt';
var ATTEND_FILE_SUFFIX = '.xlsx';

process.argv.slice(2).forEach(function (val, index, array) {
    switch (index) {
    case 0:
        enrollment_dir = val;
        break;
    case 0:
        attendance_dir = val;
        break;
    }
});

var datetime_table = {};
var class_table = {};

fs.readdirSync(attendance_dir).forEach(function (file) {
    if (file.match(/.csv.txt$/) && !file.match(/.error.csv.txt$/) && !file.indexOf(ATTEND_FILE_PREFIX) == 0) {
        var filename = path.join(attendance_dir, file);
        var readStatusDB = new db.ReadStatusDB(SEPARATOR, function (id_code, first_time, last_time, student) {
            var readStatus = new model.ReadStatus(student.lecture_id, id_code, first_time, last_time, student);
            if (!datetime_table[student.lecture_id]) {
                datetime_table[student.lecture_id] = {};
                class_table[student.lecture_id] = {};
            }
            if (!datetime_table[student.lecture_id][student.id_code]) {
                datetime_table[student.lecture_id][student.id_code] = [];
                class_table[student.lecture_id][student.id_code] = {};
            }
            datetime_table[student.lecture_id][student.id_code].push(first_time);
            return readStatus;
        });
        readStatusDB.open(filename);
    }
});


// 出席日時データをもとに、特定のコマでの出欠・遅刻の区別を出力する

var encoding = 'UTF-8';

Object.keys(datetime_table).sort().forEach(function (lecture_id) {
    var lecture_datetime_map = {};
    Object.keys(datetime_table[lecture_id]).sort().forEach(function (student_id) {
        datetime_table[lecture_id][student_id].sort().forEach(function (datetime) {
            var yyyymmddwy = datetime.get_yyyy_mm_dd_w_y();
            if (! lecture_datetime_map[yyyymmddwy]) {
                lecture_datetime_map[yyyymmddwy] = true;
            }
            if(! class_table[lecture_id][student_id][yyyymmddwy]){
                class_table[lecture_id][student_id][yyyymmddwy] = [];
            }
            class_table[lecture_id][student_id][yyyymmddwy].push(datetime);
        });
    });

    var data = '#student_id' + SEPARATOR + 'fullname';
    Object.keys(lecture_datetime_map).sort().forEach(function (yyyymmddwy) {
        data += SEPARATOR + yyyymmddwy;
    });
    data += '\n';


    var enrollment = db.loadEnrollmentFile(path.join(enrollment_dir, lecture_id + '.txt'), {
        encoding: 'Shift-JIS',
        separator: ','
    });

    //var student_id_list = Object.keys(datetime_table[lecture_id]).sort();
    var student_id_list = Object.keys(enrollment.student_db).sort();


    var file = path.join(attendance_dir, ATTEND_FILE_PREFIX + lecture_id + ATTEND_FILE_SUFFIX);
    if(ATTEND_FILE_SUFFIX.match(/\.txt$/)){

        student_id_list.forEach(function (student_id) {
                var fullname = enrollment.student_db[student_id].fullname;
                var line = student_id + SEPARATOR + fullname;
                Object.keys(lecture_datetime_map).sort().forEach(function (yyyymmddwy) {
                        var cell;
                        if (class_table[lecture_id][student_id] && class_table[lecture_id][student_id][yyyymmddwy]) {
                            cell = '1';
                        } else {
                            cell = '0';
                        }
                        line += SEPARATOR + cell;
                    });
                line += '\n';
                data += line;
            });

        fs.writeFileSync(file, data, encoding);        

    }else if(ATTEND_FILE_SUFFIX.match(/\.xlsx$/)){
        var attendance_table = [];
        var time_table = [];
        var time_exceed_table = [];

        var header_row = ['student_id', 'fullname'];

        Object.keys(lecture_datetime_map).sort().forEach(function (yyyymmddwy) {
                header_row.push(yyyymmddwy);
            });
        attendance_table.push(header_row);
        time_table.push(header_row);
        time_exceed_table.push(header_row);

        student_id_list.forEach(function (student_id) {
                var fullname = enrollment.student_db[student_id].fullname;

                var attendance_table_row = [student_id, fullname];
                var time_table_row = [student_id, fullname];
                var time_exceed_table_row = [student_id, fullname];

                Object.keys(lecture_datetime_map).sort().forEach(function (yyyymmddwy) {
                        var attendance_table_cell;
                        var time_table_cell;
                        var time_exceed_table_cell;
                        if (class_table[lecture_id][student_id] && class_table[lecture_id][student_id][yyyymmddwy]) {
                            attendance_table_cell = '1';
                            time_table_cell = class_table[lecture_id][student_id][yyyymmddwy].sort().map(function(time){
                                    return time.get_hhmmss();
                                }).join(' ');
                            time_exceed_table_cell = class_table[lecture_id][student_id][yyyymmddwy].sort().map(function(time){
                                    var delaySec = time.getAcademicClassDelayInSec();
                                    var plusminus = '';
                                    if(0 <= delaySec){
                                        plusminus = '+';
                                    }else{
                                        plusminus = '-';
                                        delaySec *= -1;
                                    }
                                    return plusminus + stringUtil.format0d(Math.floor(delaySec / 60)) + ':' + stringUtil.format0d(delaySec % 60);
                                }).join(' ');
                        } else {
                            attendance_table_cell = '0';
                            time_table_cell = '';
                            time_exceed_table_cell = '';
                        }
                        attendance_table_row.push(attendance_table_cell);
                        time_table_row.push(time_table_cell);
                        time_exceed_table_row.push(time_exceed_table_cell);
                    });
                attendance_table.push(attendance_table_row);
                time_table.push(time_table_row);
                time_exceed_table.push(time_exceed_table_row);
            });

        fs.writeFileSync(file, xlsx.build({worksheets:[
                                                       {'name':'attendance', 'data':attendance_table},
                                                       {'name':'time', 'data':time_table},
                                                       {'name':'time_exceed', 'data':time_exceed_table}
                                                       ]}), encoding);
    }
});