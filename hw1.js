
function distance(vec1, vec2)
{
    return Math.sqrt( Math.pow((vec1[0]-vec2[0]), 2) + Math.pow((vec1[1]-vec2[1]), 2) );
}

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

var fill;
var iterations = 3;

var index = 0;
var vertices = [];
var vertexColors = [];

var polygonStart;
var edgeSelected = false;
var mouseMoved = false;
var polygonDrawn = false;
var isRuleApplied = false;

var bColor = new vec4(0.0, 0.0, 0.0, 1);

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
    
    canvas.addEventListener("click", function(event){
        if (!polygonDrawn)
        {
            var rect = canvas.getBoundingClientRect();
            var t = vec2((2*(event.clientX-rect.left)/canvas.width-1), 
                (2*(canvas.height-event.clientY+rect.top)/canvas.height-1));
            if (index == 0)
            {
                polygonStart = t;
            }

            if (edgeSelected && distance(t, polygonStart) < 0.03)
            {
                polygonDrawn = true;
            }
            else 
            {
                gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));
                vertices.push(t);

                gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
                t = new vec4(bColor[0], bColor[1], bColor[2], bColor[3]);
                gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(t));
                vertexColors.push(t);

                index++;
                edgeSelected = true;
            }
            mouseMoved = false;
        }
    } );

    canvas.addEventListener("mousemove", function(event){
        if (!polygonDrawn && edgeSelected) {
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
            var rect = canvas.getBoundingClientRect();
            var t = vec2((2*(event.clientX-rect.left)/canvas.width-1), 
                (2*(canvas.height-event.clientY+rect.top)/canvas.height-1));
            gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));

            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
            t = new vec4(bColor[0], bColor[1], bColor[2], bColor[3]);
            gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(t));

            mouseMoved = true;
        }
    } );

    fill = document.getElementById("fill");

    var backgroundColor = document.getElementById("background");
    backgroundColor.addEventListener("change", function() {
        var rgb = hexToRgbA(backgroundColor.value);
        gl.clearColor(rgb[0], rgb[1], rgb[2], rgb[3]);
        document.getElementById("backgroundIcon").style.color = "rgb(" + rgb[0]*255 + ", " + rgb[1]*255 + ", " + rgb[2]*255 + ")";
    });

    var brushColor = document.getElementById("brush");
    brushColor.addEventListener("change", function() {
        bColor = hexToRgbA(brushColor.value); 
        document.getElementById("brushIcon").style.color = "rgb(" + bColor[0]*255 + ", " + bColor[1]*255 + ", " + bColor[2]*255 + ")";
    });

    var polygonColor = document.getElementById("polygonColor");
    polygonColor.addEventListener("change", function() {
        var pColor = hexToRgbA(polygonColor.value); 
        if (polygonDrawn) {
            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
            t = new vec4(pColor[0], pColor[1], pColor[2], pColor[3]);
            for (i = 0; i < vertices.length; i++)
            {
                gl.bufferSubData(gl.ARRAY_BUFFER, 16*i, flatten(t));
            }
        }
        document.getElementById("sfcIcon").style.color = "rgb(" + pColor[0]*255 + ", " + pColor[1]*255 + ", " + pColor[2]*255 + ")";
    });

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
        $("#rangeV").fadeIn();
    },
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

    var deletePolygon = document.getElementById("deletePolygon");
    deletePolygon.addEventListener('click', function() {
        gl.clear( gl.COLOR_BUFFER_BIT );
        polygonDrawn = false;
        edgeSelected = false;
        mouseMoved = false;
        isRuleApplied = false;
        index = 0;
        vertices = [];
    });
    var applyRule = document.getElementById("applyRule");
    applyRule.addEventListener('click', function() {
        gl.clear( gl.COLOR_BUFFER_BIT );
        if(polygonDrawn)
        {
            ruleApplication();
        }
    });

    var save = document.getElementById("save");
    save.addEventListener("click", function() {
        var a = document.body.appendChild(
            document.createElement("a")
        );
        if (polygonDrawn)
        {
            a.download = "SavedKochCurve.txt";
            a.href = "data:text/plain;base64," + btoa("Vertices: " + JSON.stringify(vertices) + "\nColors: " + JSON.stringify(vertexColors) + "\nIsRuleApplied: " + isRuleApplied + "\nIterations: " + iterations);
            a.innerHTML = "";
            a.click()
            document.body.removeChild(a);
        }
        else
        {
            alert("Please either draw a polygon, or apply a koch rule to a drawn polygon to save it.");
        }
    });

    var load = document.getElementById("load");
    load.addEventListener("click", function() {
        var fileInput = document.body.appendChild(
            document.createElement("input")
        );
        let file;
        fileInput.type = "file";
        fileInput.style.visibility = "hidden";
        fileInput.addEventListener("input", function(event) {
            file = event.target.files[0];
            const fileType = file.type ? file.type : 'NOT SUPPORTED';
            
            if (fileType != "text/plain")
            {
                document.body.removeChild(fileInput);
                alert("Please upload a text file, with a form given by save functionality.");
                return;
            }

            var fr=new FileReader(); 
            fr.onload=function(){ 
                var stringVertices = fr.result;
                vertices = eval(stringVertices.substr(stringVertices.indexOf("Vertices: ") + 10, stringVertices.indexOf("Colors: ") - 10));
                
                vertexColors = eval(stringVertices.substr(stringVertices.indexOf("Colors: ") + 8, stringVertices.indexOf("IsRuleApplied: ") - (stringVertices.indexOf("Colors: ") + 8)));

                isRuleApplied = stringVertices.substr(stringVertices.indexOf("IsRuleApplied: ") + 15, 5);
                isRuleApplied = isRuleApplied == "false" ? false : true;

                iterations = eval(stringVertices.substr(stringVertices.indexOf("Iterations: ") + 12, stringVertices.length));
                
                let t;
                if (isRuleApplied)
                {
                    ruleApplication();
                }
                else
                {
                    for (i = 0; i < vertices.length; i++)
                    {
                        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
                        t = vertices[i];
                        gl.bufferSubData(gl.ARRAY_BUFFER, 8*i, flatten(t));

                        gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
                        let vertexColor = vertexColors[i];
                        t = new vec4(vertexColor[0], vertexColor[1], vertexColor[2], vertexColor[3]);
                        gl.bufferSubData(gl.ARRAY_BUFFER, 16*i, flatten(t));
                    }
                }
                polygonDrawn = true;
            };
            fr.readAsText(file); 
            document.body.removeChild(fileInput);
        });

        fileInput.click();
        let fileUploadTimeout = setInterval(function() {
            document.body.removeChild(fileInput);
            clearInterval(fileUploadTimeout);         
        }, 60000);
    });

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

function line(a, b)
{
    points.push(a, b);
}

function rotate90(rotating, fixed)
{
    rotating = subtract(rotating, fixed);
    var temp = rotating[0]
    rotating[0] = -rotating[1];
    rotating[1] = temp;
    rotating = add(rotating, fixed);
    return rotating;
}

function rotate270(rotating, fixed)
{
    rotating = subtract(rotating, fixed);
    var temp = rotating[0]
    rotating[0] = rotating[1];
    rotating[1] = -temp;
    rotating = add(rotating, fixed);
    return rotating;
}

function divideEdge(a, b, count)
{
    if (count <= 0)
    {
        line(a, b);
    }
    else {
        var c = mix(a, b, 0.25);
        var e = rotate270(a, c);
        var f = rotate90(c, e);
        
        var g = mix(a, b, 0.50);

        var d = mix(a, b, 0.75);

        var h = rotate270(b, d);
        var j = rotate90(d, h);

        --count;

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

function ruleApplication()
{
    points = [];
    for (i = 0; i < vertices.length - 1; i++)
    {
        divideEdge(vertices[i], vertices[i + 1], iterations);
    }
    divideEdge(vertices[vertices.length - 1], vertices[0], iterations);
    
    points = [...new Set(points)];
    let vertexColor;
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

    isRuleApplied = true;
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );

    if (!isRuleApplied)
    {
        if (!polygonDrawn && mouseMoved)
        {
            gl.drawArrays(gl.LINE_STRIP, 0, index + 1);
        }
        else if (polygonDrawn)
        {
            if (fill.checked) 
            {
                gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);
            }
            else
            {
                gl.drawArrays(gl.LINE_LOOP, 0, vertices.length);
            }
        }
    }
    else
    {
        gl.drawArrays(gl.LINE_LOOP, 0, points.length);
    }

    window.requestAnimFrame(render);
}
