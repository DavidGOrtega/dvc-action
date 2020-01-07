


var app = require('./app');


var columns = [
    'a',
    'b',
    'c',
];



var object = [
    {
        a: 'asdfa',
        b: '239487',
        c: '234',
    },
    {
        a: 'sdf',
        b: 'gsdf',
        c: 'sfd',
    }
];

console.log('app.convert',app(object, columns));


