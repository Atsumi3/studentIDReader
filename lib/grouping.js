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

var DEBUG = false;

/**
@param [Integer] numGroups グループ分けするグループの数
@param [Integer] numMininumMembers 出席者の最低人数
*/
exports.MemberGroups = function (numGroups, numMinimumMembers) {

    this.numGroups = numGroups;
    this.numMinimumMembers = numMinimumMembers;

    this.groupMembers = [];
    this.mapMemberToGroupIndex = {};

    if (numMinimumMembers){
        if ( numMinimumMembers % numGroups != 0 ) {
            throw "numMinimumMembers % numGroups != 0";
        }

        this.shuffledNumbers = [];
        for( var i = 0; i < numMinimumMembers; i+= numGroups) {
            for( var j = 0; j < numGroups; j++) {
                this.shuffledNumbers.push(j);
            }
        }
        this.shuffledNumbers.shuffle();
        //console.log(this.shuffledNumbers);
    }

    for (var i = 0; i < this.numGroups; i++) {
        this.groupMembers.push([]);
    }

    this.selectCandidateGroups = function () {
        var max = 0;
        var maxCount = 0;
        var i;

        for (i = 0; i < this.numGroups; i++) {
            var numMembers = this.groupMembers[i].length;
            if (max < numMembers) {
                max = numMembers;
                maxCount = 1;
            } else if (max == numMembers) {
                maxCount++;
            }
        }

        if (DEBUG) {
            console.log("===============");
            console.log("max " + max);
            console.log("maxCount " + maxCount);
        }

        var candidateGroups = [];

        if (maxCount == this.numGroups) {
            for (i = 0; i < this.numGroups; i++) {
                candidateGroups[i] = i;
            }
            return candidateGroups;
        } else {
            for (i = 0; i < this.numGroups; i++) {
                if (this.groupMembers[i].length != max) {
                    candidateGroups.push(i);
                }
            }
            return candidateGroups;
        }
    };

    this.chooseRandomCandidateGroupIndex = function () {
        if (! this.numMinimumMembers || this.numMinimumMembers <= Object.keys(this.mapMemberToGroupIndex).length) {
            if (DEBUG) {
                console.log("mode 1 : "+ Object.keys(this.mapMemberToGroupIndex).length);
            }
            var candidateGroups = this.selectCandidateGroups();
            return candidateGroups[Math.floor(Math.random() * candidateGroups.length)];
        } else {
            if (DEBUG) {
                console.log("mode 0 : "+ Object.keys(this.mapMemberToGroupIndex).length);
            }
            return this.shuffledNumbers.pop();
        }
    };

    this.addGroupMember = function (groupIndex, userID) {
        this.groupMembers[groupIndex].push(userID);
        this.mapMemberToGroupIndex[userID] = groupIndex;
    };

    this.chooseAndAddRandomCandidateGroupIndex = function (userID) {
        var groupIndex = this.chooseRandomCandidateGroupIndex();
        if (DEBUG) {
            console.log("set user:"+userID+" into group:"+groupIndex);
        }
        this.addGroupMember(groupIndex, userID);
        return groupIndex;
    }

    this.getGroupMembers = function (groupIndex) {
        return this.groupMembers[groupIndex];
    };

    this.getGroupIndexOf = function (userID) {
        return this.mapMemberToGroupIndex[userID];
    };
};