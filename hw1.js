/*
    This function returns the distance between 2 vectors.
    vec1 - First vector
    vec2 - Second vector
*/
function distance(vec1, vec2)
{
    return Math.sqrt( Math.pow((vec1[0]-vec2[0]), 2) + Math.pow((vec1[1]-vec2[1]), 2) );
}

/*
    This function gets a hex-coded color and converts that color to rgba value. Credit to: https://stackoverflow.com/a/21648508
    hex - Hex value of a color
    return rgba value of that color.
*/
function hexToRgbA(hex){
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        rgb = new vec4(((c>>16)&255)/255, ((c>>8)&255)/255, (c&255)/255, 1);
        return rgb;
    }
    throw new Error('Bad Hex');
}

var canvas;
var gl;

var program;

var vBuffer, cBuffer;

var fill; // Fill option on the page
var iterations = 3; // Total recursive iterations that will be applied to the polygon.

var index = 0; // Index of vertex
var vertices = []; // Vertex array 
var vertexColors = []; // Colors of vertices

var polygonStart; // Initial point of the polygon
var edgeSelected = false; // Flag for 2nd vertex click that will complete an edge.
var mouseMoved = false; // Flag for dynamically moving and showing an edge.
var polygonDrawn = false; // Flag for polygon drawing.
var isRuleApplied = false; // Flag for koch curve rule apply for polygon.

var bColor = new vec4(0.0, 0.0, 0.0, 1); // brush color of canvas.

var points = [];
window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16000000, gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 32000000, gl.STATIC_DRAW);
    
    var vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    /*
        Create a vertex when there is no ongoing edge drawing and user clicks a point on canvas.
    */
    canvas.addEventListener("click", function(event){
        if (!polygonDrawn) // Only draw a vertex if polygon is not drawn.
        {
            var rect = canvas.getBoundingClientRect(); // Get the relative position of canvas in the page.
            var t = vec2((2*(event.clientX-rect.left)/canvas.width-1), 
                (2*(canvas.height-event.clientY+rect.top)/canvas.height-1)); // Calculate the mouse click point on canvas.
            if (index == 0) // If this is the first vertex of polygon, mark it.
            {
                polygonStart = t;
            }

            if (edgeSelected && distance(t, polygonStart) < 0.03) // If there are at least 3 vertices and next click is near the initial polygon vertex, complete the polygon.
            {
                polygonDrawn = true;
            }
            else // Else add the vertex to the vertex buffer and vertex array, alongside its color.
            {
                gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));
                vertices.push(t);

                gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
                t = new vec4(bColor[0], bColor[1], bColor[2], bColor[3]);
                gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(t));
                vertexColors.push(t);

                index++;
                edgeSelected = true; // Flag edge selection so that edge drawing will be dynamically shown to the user.
            }
            mouseMoved = false; // When initially clicked, don't try to draw an edge. Only try to draw it if the mouse is moved.
        }
    } );

    /*
        If user already selected a vertex and trying to select another one to draw an edge, dynamically show the edge with mouse movement on canvas.
    */
    canvas.addEventListener("mousemove", function(event){
        if (!polygonDrawn && edgeSelected) { // If no polygon is already drawn, and if a vertex is already selected, draw an edge by continously changing the position of second vertex with mouse movement.
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
            var rect = canvas.getBoundingClientRect(); 
            var t = vec2((2*(event.clientX-rect.left)/canvas.width-1), 
                (2*(canvas.height-event.clientY+rect.top)/canvas.height-1));
            gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t)); // By not incrementing the index, we already change the drawn index by changing the next vertex.

            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
            t = new vec4(bColor[0], bColor[1], bColor[2], bColor[3]);
            gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(t));

            mouseMoved = true; // Flag mouse movement for render.
        }
    } );

    /*
        BELOW CODE SEGMENTS ARE RELATED TO THE PAGE ELEMENTS AND THEIR FUNCTIONALITIES.
    */

    fill = document.getElementById("fill"); // Fill checkbox in the page.

    var backgroundColor = document.getElementById("background"); // color input for background.
    backgroundColor.addEventListener("change", function() {
        var rgb = hexToRgbA(backgroundColor.value); // get hex value of background color input when changed.
        gl.clearColor(rgb[0], rgb[1], rgb[2], rgb[3]); // clear the background with that color.
        document.getElementById("backgroundIcon").style.color = "rgb(" + rgb[0]*255 + ", " + rgb[1]*255 + ", " + rgb[2]*255 + ")"; // Also change the icon color with the same color.
    });

    var brushColor = document.getElementById("brush"); // color input for brush.
    brushColor.addEventListener("change", function() {
        bColor = hexToRgbA(brushColor.value);  // get hex value of brush color input when changed.
        document.getElementById("brushIcon").style.color = "rgb(" + bColor[0]*255 + ", " + bColor[1]*255 + ", " + bColor[2]*255 + ")"; // Also change the icon color with the same color.
    });

    var polygonColor = document.getElementById("polygonColor"); // color input for polygon.
    polygonColor.addEventListener("change", function() {
        var pColor = hexToRgbA(polygonColor.value);  // get hex value of polygon color input when changed.
        if (polygonDrawn) { // Only change the color of polygon if its already drawn.
            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
            t = new vec4(pColor[0], pColor[1], pColor[2], pColor[3]);
            // Override the color of the vertices with the selected color. This will cause the polygon to have single color.
            for (i = 0; i < vertices.length; i++)
            {
                gl.bufferSubData(gl.ARRAY_BUFFER, 16*i, flatten(t));
            }
        }
        document.getElementById("sfcIcon").style.color = "rgb(" + pColor[0]*255 + ", " + pColor[1]*255 + ", " + pColor[2]*255 + ")"; // Also change the icon color with the same color.
    });

    /*
        Below code segments belongs to the iteration slider on the page. Credit: https://css-tricks.com/value-bubbles-for-range-inputs/
    */
    const
    range = document.getElementById('range'),
    rangeV = document.getElementById('rangeV'),
    setValue = ()=>{
        clearInterval(fadeoutTime);
        restartFadeoutTimer();
        const
            newValue = Number( (range.value - range.min) * 100 / (range.max - range.min) ),
            newPosition = 10 - (newValue * 0.2);
        iterations = range.value;
        rangeV.innerHTML = `<span>${range.value}</span>`;
        rangeV.style.left = `calc(${newValue}% + (${newPosition}px))`;
        rangeV.style.top = "-35px";
        $("#rangeV").fadeIn(); // If the user changes iterations, fade the value bubble in.
    },
    // After a second of no input on iteration slider, fade the value bubble out.
    restartFadeoutTimer = ()=>{
        fadeoutTime = setInterval(function() {
            $("#rangeV").fadeOut();
        }, 1000); 
    }
    var fadeoutTime = setInterval(function() {
        $("#rangeV").fadeOut();
    }, 1000); 
    document.addEventListener("DOMContentLoaded", setValue);
    range.addEventListener('input', setValue);

    var deletePolygon = document.getElementById("deletePolygon"); // "Delete Polygon" button on page.
    deletePolygon.addEventListener('click', function() {
        gl.clear( gl.COLOR_BUFFER_BIT ); // Clear color buffer.
        // Reset all the flags related to the canvas and reset all arrays.
        polygonDrawn = false;
        edgeSelected = false;
        mouseMoved = false;
        isRuleApplied = false;
        index = 0;
        vertices = [];
    });
    var applyRule = document.getElementById("applyRule"); // "Apply Rule" button on page.
    applyRule.addEventListener('click', function() {
        gl.clear( gl.COLOR_BUFFER_BIT );
        if(polygonDrawn) // Only apply the koch curve rule if a polygon is drawn.
        {
            ruleApplication(); // Apply rule.
        }
    });

    var save = document.getElementById("save"); // "Save" button on page.
    save.addEventListener("click", function() {
        if (polygonDrawn) // If a polygon is already drawn
        {
            // Append a temporary hyper link element to the page.
            var a = document.body.appendChild(
                document.createElement("a")
            );
            a.download = "SavedKochCurve.txt"; // Downloand file name
            /* Downloaded text file contents. The format is like this "Vertices: {vertices array}
                                                                       Colors: {color array}
                                                                       IsRuleApplied: true/false
                                                                       Iterations: 1-6 number"
                                                                       */
            a.href = "data:text/plain;base64," + btoa("Vertices: " + JSON.stringify(vertices) + "\nColors: " + JSON.stringify(vertexColors) + "\nIsRuleApplied: " + isRuleApplied + "\nIterations: " + iterations);
            a.innerHTML = ""; // No text on temp element.
            a.click() // Simulate click for download.
            document.body.removeChild(a); // Remove the temporary element from page.
        }
        else // If no polygon is drawn, ask user to draw one for this functionality to be available.
        {
            alert("Please either draw a polygon, or apply a koch rule to a drawn polygon to save it.");
        }
    });

    var load = document.getElementById("load"); // "Load" button on page.
    load.addEventListener("click", function() {
        // Create a temporary file input element on page.
        var fileInput = document.body.appendChild(
            document.createElement("input")
        );
        let file;
        fileInput.type = "file"; // File input type.
        fileInput.style.visibility = "hidden"; // Do not show it on page.
        fileInput.addEventListener("input", function(event) {
            file = event.target.files[0]; // get the input file.
            const fileType = file.type ? file.type : 'NOT SUPPORTED'; // Get its type.
            
            if (fileType != "text/plain") // If its not text (save format), do not allow it and remove temporary element.
            {
                document.body.removeChild(fileInput);
                alert("Please upload a text file, with a form given by save functionality.");
                return;
            }

            // Read the input file
            var fr=new FileReader(); 
            fr.onload=function(){ 
                var stringVertices = fr.result; // get text inside the file.
                vertices = eval(stringVertices.substr(stringVertices.indexOf("Vertices: ") + 10, stringVertices.indexOf("Colors: ") - 10)); // Gets the vertices array from the file.
                
                vertexColors = eval(stringVertices.substr(stringVertices.indexOf("Colors: ") + 8, stringVertices.indexOf("IsRuleApplied: ") - (stringVertices.indexOf("Colors: ") + 8))); // Gets the color array from the file.

                isRuleApplied = stringVertices.substr(stringVertices.indexOf("IsRuleApplied: ") + 15, 5); // Gets the isRuleApplied as string from the file.
                isRuleApplied = isRuleApplied == "false" ? false : true; // Changes iterations from string to boolean.

                iterations = eval(stringVertices.substr(stringVertices.indexOf("Iterations: ") + 12, stringVertices.length)); // Gets the iterations from the file.
                
                let t;
                if (isRuleApplied) // If the save drawing was a already applied koch curve, apply the rule with same options to the original polygon of that applied koch curve.
                {
                    ruleApplication();
                }
                else // If not, just draw the polygon with its original vertices and colors.
                {
                    for (i = 0; i < vertices.length; i++)
                    {
                        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
                        t = vertices[i];
                        gl.bufferSubData(gl.ARRAY_BUFFER, 8*i, flatten(t));

                        gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
                        let vertexColor = vertexColors[i]; // There are colors for each vertex.
                        t = new vec4(vertexColor[0], vertexColor[1], vertexColor[2], vertexColor[3]);
                        gl.bufferSubData(gl.ARRAY_BUFFER, 16*i, flatten(t));
                    }
                }
                polygonDrawn = true; // Flag as polygon is drawn.
            };
            fr.readAsText(file);  // Read save file.
            document.body.removeChild(fileInput); // Remove temporary element.
        });

        fileInput.click(); // Simulate click for action.
        // If the user cancels the load operation, the temporary element will not be deleted. So we delete it either way with a 60 seconds timer.
        let fileUploadTimeout = setInterval(function() {
            document.body.removeChild(fileInput);
            clearInterval(fileUploadTimeout);         
        }, 60000);
    });

    // If the scroll is at the top, promp the user with options info box by showing it, if scroll is not at the top, fade it out.
    window.onscroll =  function() {
        if (document.documentElement.scrollTop > 0)
        {
            $("#optionsInfo").fadeOut(150);
        }
        else
        {
            $("#optionsInfo").fadeIn(500);
        }
    };
    render(); 
}

/*
    This function adds an edge with 2 vertices given.
    a - first vertex.
    b - second vertex.
*/
function line(a, b)
{
    points.push(a, b);
}

/*
    This function rotates a point around a fixed point by 90 degrees with given mathematical equation:
    x' = xcos(theta) - ysin(theta)
    y' = xsin(theta) + ycos(theta)
    rotating - point that will be rotated.
    fixed - point that rotating point will be rotated around.
    return rotated point around fixed point.
*/
function rotate90(rotating, fixed)
{
    rotating = subtract(rotating, fixed);
    var temp = rotating[0]
    rotating[0] = -rotating[1];
    rotating[1] = temp;
    rotating = add(rotating, fixed);
    return rotating;
}

/*
    This function rotates a point around a fixed point by 270 degrees with given mathematical equation:
    x' = xcos(theta) - ysin(theta)
    y' = xsin(theta) + ycos(theta)
    rotating - point that will be rotated.
    fixed - point that rotating point will be rotated around.
    return rotated point around fixed point.
*/
function rotate270(rotating, fixed)
{
    rotating = subtract(rotating, fixed);
    var temp = rotating[0]
    rotating[0] = rotating[1];
    rotating[1] = -temp;
    rotating = add(rotating, fixed);
    return rotating;
}


/*
    This recursive function applied the koch curve rule to a given edge. a and b are initial vertices of the edge, and the count is the iteration amount for the rule.
    Illustration of the recursive function for 1 iteration: https://imgur.com/f9v0p06
    a - first index of edge.
    b - second index of edge.
    count - iteration amount.
*/
function divideEdge(a, b, count)
{
    if (count <= 0) // If there are no more iterations to be done, add the edge.
    {
        line(a, b);
    }
    else {
        var c = mix(a, b, 0.25); // Get the first quarter point of the edge.
        var e = rotate270(a, c); // Rotate a by 270 degrees to get the next point
        var f = rotate90(c, e); // Rotate c by 90 degrees to get the next point.
        
        var g = mix(a, b, 0.50); // The next point is the middle point of the edge.

        var d = mix(a, b, 0.75); // Get the third quarter point of the edge. 

        var h = rotate270(b, d); // Rotate b by 270 degrees to get the next point
        var j = rotate90(d, h); // Rotate d by 90 degrees to get the next point

        --count; 

        /*
            Form the koch curve rule applied edge by combining it accordingly, given specifically in the imgur link.
        */
        divideEdge(a, c, count);
        divideEdge(c, e, count);
        divideEdge(e, f, count);
        divideEdge(f, g, count);

        divideEdge(g, j, count);
        divideEdge(j, h, count);
        divideEdge(h, d, count);
        divideEdge(d, b, count);
    }
}

/*
    This function applies to koch curve rule to all edges of the drawn polygon.
*/
function ruleApplication()
{
    /*
        Apply koch curve rule to every edge of the polygon.
    */
    points = [];
    for (i = 0; i < vertices.length - 1; i++)
    {
        divideEdge(vertices[i], vertices[i + 1], iterations);
    }
    divideEdge(vertices[vertices.length - 1], vertices[0], iterations); // Last edge is special case because it connext to initial vertex.
    
    points = [...new Set(points)]; // Remove duplicate points.
    let vertexColor;
    /*
        For each point in the koch curve, add it to vertex buffer but all color between to vertex points of a koch curve will be the same color of the previous origina vertex.
    */
    for (i = 0, p = 0; i < points.length; i++)
    {
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
        let t = points[i];
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*i, flatten(t));

        if (p < vertices.length && t[0] == vertices[p][0] && t[1] == vertices[p][1])
        {       
            vertexColor = vertexColors[p];   
            p++;
        }

        gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
        let c = new vec4(vertexColor[0], vertexColor[1], vertexColor[2], vertexColor[3]);
        gl.bufferSubData(gl.ARRAY_BUFFER, 16*i, flatten(c));
    }

    isRuleApplied = true; // Flag rule application.
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );

    if (!isRuleApplied) //If the rule is not applied
    {
        if (!polygonDrawn && mouseMoved) // If polygon is not drawn and the user is dynamically changing the edge
        {
            gl.drawArrays(gl.LINE_STRIP, 0, index + 1); // Draw the edges.
        }
        else if (polygonDrawn) // If polygon is drawn
        {
            if (fill.checked) // If user checked the fill option, fill the polygon with triangle fan drawing mode (only works for covnex polygon).
            {
                gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);
            }
            else // Else use line loop for polygon.
            {
                gl.drawArrays(gl.LINE_LOOP, 0, vertices.length);
            }
        }
    }
    else // If the rule is applied, draw them all using the points array.
    {
        gl.drawArrays(gl.LINE_LOOP, 0, points.length);
    }

    window.requestAnimFrame(render);
}
