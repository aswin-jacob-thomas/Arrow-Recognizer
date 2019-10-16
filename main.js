const readline = require('readline');
const fs = require('fs');
const os = require('os');
const arrowsFile = './arrows.json';
const otherFile = './other.json'

const features = require('./features');
const sketchCount = features.sketchCount;
const extractFeatures = features.extractFeatures;
const outputFile = features.outputFile;

let arrowFeatures = Array(sketchCount);
let otherFeatures = Array(sketchCount);

// This will create the readStream, readLine interface, and readLine event handlers for the given fileName
// Returns the readLine object
function processFile(fileName, label, featureArray, maxLines) {
    const readStream = fs.createReadStream(fileName);
    const rl = readline.createInterface({
        input: readStream
    });

    let line_ct = 0;
    rl.on('line', line => {
        let id = line_ct;
        if (line_ct < maxLines || maxLines === 0) {
            line_ct++;
            let sketch = JSON.parse(line);
            let points = arrToObj(sketch.points);
            let stroke = sketch.strokes[0];
            let features = extractFeatures(stroke.points);
            features.push(label);
            featureArray[id] = features;
        } else { // Past the number of values we want. Close and destroy the stream
            rl.close();
            readStream.destroy();
        }
    });

    rl.on('close', () => {
        console.log('Total ' + label + ': ' + line_ct);
        writeCSV();
    });

    return rl;
}

// Turns an array of points w/ an id property into an object where the key is the id and value is the remaining point properties
function arrToObj(points) {
    const pointObj = {};
    points.forEach(point => {
        let id = point.id;
        delete point.id;
        pointObj[id] = point;
    });
    return pointObj;
}

// Takes a stroke with points that are just IDs and a points object w/ keys that are point IDs. Returns the stroke with the points as x, y, time instead of an ID.
function populateStrokePoints(stroke, points) {
    if (stroke.points[0].x) { // Return if the stroke already contains points instead of pointIds
        return stroke;
    }
    stroke.points = stroke.points.map(pointId => {
        return points[pointId];
    });
    return stroke;
}

// Returns a string with f1, f2, etc. and the last column called label. Has the EOL attached already
function getCSVHeader() {
    let columns = [];
    for (let i = 0; i < arrowFeatures[0].length - 1; i++) {
        columns.push(`f${i+1}`);
    }
    columns.push('label');
    return columns.join() + os.EOL;
}

function writeCSV() {
    if (!arrowRl.closed || !otherRl.closed) return; // If either readline stream is not closed, return
    let output = getCSVHeader();
    output += arrowFeatures.map(elem => elem.join()).join(os.EOL); // First join each element into a comma separated string and create an array of these strings, then join each line with a EOL separator
    output += os.EOL;
    output += otherFeatures.map(elem => elem.join()).join(os.EOL);
    fs.writeFileSync(outputFile, output);
    console.log(`Wrote feature values to ${outputFile}`);
}

console.log(`Processing ${sketchCount > 0 ? sketchCount : 'all'} of each sketch type`)
const arrowRl = processFile(arrowsFile, 'arrow', arrowFeatures, sketchCount);
const otherRl = processFile(otherFile, 'other', otherFeatures, sketchCount);
