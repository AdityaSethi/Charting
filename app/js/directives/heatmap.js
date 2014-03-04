'use strict';

angular.module('app.directives')

.directive('chartheatmap', function (Data) {
  return {
    restrict: 'E',
    template: '<div id={{chartid}} class="heatmap"></div>',
    scope: {
        chartData: "=chartId",
        tabledata: "=tabledata",
        threshold: "=threshold",
        colors: "=colors",
        chartid: "=chartid",
        colorHeatmap: "=colorheatmap"
    },
    transclude:true,
    replace: false,

    link: function (scope, element, attrs) {
      function drawChart(api_data) {
          d3.select("#"+scope.chartid+ " svg").remove();
          d3.select("#"+scope.chartid+ " svg.posFixed").remove();
          var complete_data = [];
          var place = 0;
          scope.tabledata = api_data;
          for(var i = 0; i < api_data.values.length; i++){
            for(var j = 0; j < api_data.values[i].length; j++){
              var dataObj = {row: "", col : "", values: ""};
              dataObj.row = i;
              dataObj.col = j;
              dataObj.values = api_data.values[i][j];
              complete_data[place] = dataObj;
              place++
            }
          }

          var margin = { top: 50, right: 10, bottom: 50, left: 50 },
              defaultColors = colors = ['#57c779', '#aed77a', '#ffe97d', '#ffd576', '#ff5d5b'],
              col_number=scope.tabledata.headcolumnMiddle.length+1,
              row_number=scope.tabledata.headrow.length+1,
              colorsArray=scope.colors || defaultColors,
              reverse=attrs.reverseColor || false,
              cellSize=attrs.cellheight || 40,
              cellWidth=attrs.cellwidth || 40,
              columnAngle = attrs.columnlabelangle,
              width = cellWidth*col_number, // - margin.left - margin.right,
              height = cellSize*row_number , // - margin.top - margin.bottom,
              //gridSize = Math.floor(width / 24),
              legendElementWidth = cellWidth*2.5,
              colorBuckets = 21,
              colors = ['#005824','#1A693B','#347B53','#4F8D6B','#699F83','#83B09B','#9EC2B3','#B8D4CB','#D2E6E3','#EDF8FB','#FFFFFF','#F1EEF6','#E6D3E1','#DBB9CD','#D19EB9','#C684A4','#BB6990','#B14F7C','#A63467','#9B1A53','#91003F'],
              rowLabel = scope.tabledata.headrow;
              if(scope.tabledata.headcolumnTop != undefined){
                var colLabelTop = scope.tabledata.headcolumnTop;
              }
              if(scope.tabledata.headcolumnMiddle != undefined){
                var colLabelMiddle = scope.tabledata.headcolumnMiddle;
              }
              if(scope.tabledata.headcolumnBottom != undefined){
                var colLabelBottom = scope.tabledata.headcolumnBottom;  
              }
              


          // Color Coding
          var defaultColorSelect = function (value, x){
            var color = "";
            x = scope.threshold || 50;
            if (x > 0){
              if(value > x){
                color = colorsArray[0];
              }
              else if(value <= x && value >= 0 ){
                color = colorsArray[3];
              }
              else{
                color = colorsArray[4]
              }
            }
            else{
              if(value >= 0){
                color = colorsArray[0];
              }
              else if(value < 0 && value >= x){
                color = colorsArray[3];
              }
              else{
                color = colorsArray[4];
              }
            }
            return color;
          }

          var colorSelect = scope.colorHeatmap || defaultColorSelect;

          if(columnAngle === undefined) {
            columnAngle = -90;
          }

          var colorScale = d3.scale.quantile()
              .domain([ -10 , 0, 10])
              .range(colors);
          
          
          var svg = d3.select("#"+scope.chartid).append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top)
              .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
              ;

          var rowSvg = d3.select("#"+scope.chartid).append("svg")
              .attr("class", "posFixed")
              .attr("width", 50)
              .attr("height", height + margin.top)
              .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
              ;    
          
          var rowSortOrder=false;
          var colSortOrder=false;
          
          var rowLabels = rowSvg.append("g")
              .attr("class", "fixedPos")
              .selectAll(".rowLabelg")
              .data(rowLabel)
              .enter()
              .append("text")
              .text(function (d) { return d; })
              .attr("x", 0)
              .attr("y", function (d, i) { return (i) * cellSize; })
              .style("text-anchor", "end")
              .attr("transform", "translate(-6," + cellSize / 1.5 + ")")
              .attr("class", function (d,i) { return "rowLabel mono r"+i;} ) 
              .on("mouseover", function(d) {d3.select(this).classed("text-hover",true);})
              .on("mouseout" , function(d) {d3.select(this).classed("text-hover",false);})
              .on("click", function(d,i) {rowSortOrder=!rowSortOrder; sortbylabel("r",i,rowSortOrder);d3.select("#order").property("selectedIndex", 4).node().focus();;})
              ;
                

            var colLabelsMiddle = svg.append("g")
                .selectAll(".colLabelg")
                .data(colLabelMiddle)
                .enter()
                .append("text")
                .html(function (d) { return d; })
                .attr("x", function (d, i) { var x = i * cellWidth - 7; return x; })
                .attr("y", function (d, i) { var x = attrs.view != undefined? -10 : 0; return 0 })
                .style("text-anchor", "left")
                .attr("transform", "translate("+cellWidth/2 + ",-6)")
                .attr("class",  function (d,i) { return "colLabel mono c"+i;} )
                .on("mouseover", function(d) {d3.select(this).classed("text-hover",true);})
                .on("mouseout" , function(d) {d3.select(this).classed("text-hover",false);})
                .on("click", function(d,i) {colSortOrder=!colSortOrder;  sortbylabel("c",i,colSortOrder);d3.select("#order").property("selectedIndex", 4).node().focus();;})
                ;
            
          var heatMap = svg.append("g").attr("class","g3")
                .selectAll(".cellg")
                .data(complete_data, function(d){ return d.row +":"+ d.col})
                .enter()
                .append("rect")
                .text(function(d){ return parseFloat(d.values).toFixed(1)})
                .attr("x", function(d) { return d.col * cellWidth; })
                .attr("y", function(d) { return d.row * cellSize; })
                .attr("class", function(d){return "cell cell-border cr main-cell"+(d.row-1)+" cc"+(d.col-1)+" cluster"+(d.cluster);})
                .attr("width", cellWidth)
                .attr("height", cellSize)
                .style("fill", function(d) { return colorSelect(d.values, scope.tabledata.values, d.cluster, d.date, reverse, d, scope.mid, scope.bottomval) })
                
                .on("mouseover", function(d){
                       //highlight text
                       d3.select(this).classed("cell-hover",true);
                       d3.selectAll(".rowLabel").classed("text-highlight",function(r,ri){ return ri==(d.row);});
                       d3.selectAll(".colLabel").classed("text-highlight",function(c,ci){ return ci==(d.col);});
                        
                       //Update the tooltip position and value
                       d3.select("#tooltip-removed")
                         .style("left", (d3.event.pageX+10) + "px")
                         .style("top", (d3.event.pageY-10) + "px")
                         .select("#value")
                         .text("lables:"+rowLabel[d.row]+","+colLabelMiddle[d.col]+"\ndata:"+d.values);  
                       //Show the tooltip
                       d3.select("#tooltip-removed").classed("hidden", false);
                })

                .on("mouseout", function(){
                       d3.select(this).classed("cell-hover",false);
                       d3.selectAll(".rowLabel").classed("text-highlight",false);
                       d3.selectAll(".colLabel").classed("text-highlight",false);
                       d3.select("#tooltip-removed").classed("hidden", true);
                })

          var heatMapText = svg.append("g").attr("class","g3")
                .selectAll(".cellg")
                .data(complete_data, function(d){ return d.row +":"+ d.col})
                .enter()
                .append("text")
                .text(function(d){ return d.values})
                .attr("x", function(d) { return (d.col * cellWidth)+(cellWidth/5); })
                .attr("y", function(d) { return (d.row * cellSize)+(cellSize/2)+5; })
                .attr("class", function(d){return "cell cr"+(d.row-1)+" cc"+(d.col-1)+" cluster"+(d.cluster);})
                .attr("width", cellWidth)
                .attr("height", cellSize)
                .style("fill", function(d) { return "#000000" })  
                
                .on("mouseover", function(d){
                       //highlight text
                       d3.select(this).classed("cell-hover",true);
                       d3.selectAll(".rowLabel").classed("text-highlight",function(r,ri){ return ri==(d.row);});
                       d3.selectAll(".colLabel").classed("text-highlight",function(c,ci){ return ci==(d.col);});
                        
                       //Update the tooltip position and value
                       d3.select("#tooltip-removed")
                         .style("left", (d3.event.pageX-240) + "px")
                         .style("top", (d3.event.pageY) + "px")
                         .select("#value")
                         .text("lables:"+rowLabel[d.row]+","+colLabelMiddle[d.col]+"\ndata:"+d.values);  
                       //Show the tooltip
                       d3.select("#tooltip-removed").classed("hidden", false);
                })
                .on("mouseout", function(){
                       d3.select(this).classed("cell-hover",false);
                       d3.selectAll(".rowLabel").classed("text-highlight",false);
                       d3.selectAll(".colLabel").classed("text-highlight",false);
                       d3.select("#tooltip-removed").classed("hidden", true);
                })
                ;

            var legend = svg.selectAll(".legend")
                .data([-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10])
                .enter().append("g")
                .attr("class", "legend");
           
            legend.append("rect")
              .attr("x", function(d, i) { return legendElementWidth * i; })
              .attr("y", height+(cellSize*2))
              .attr("width", legendElementWidth)
              .attr("height", cellSize)
              .style("fill", function(d, i) { return colors[i]; });
           
            legend.append("text")
              .attr("class", "mono")
              .text(function(d) { return d; })
              .attr("width", legendElementWidth)
              .attr("x", function(d, i) { return legendElementWidth * i; })
              .attr("y", height + (cellSize*4));

            if(attrs.textvisible == 'no'){
              heatMapText.remove()
            }  

        // Change ordering of cells

          function sortbylabel(rORc,i,sortOrder){
               var t = svg.transition().duration(3000);
               var log2r=[];
               var sorted; // sorted is zero-based index
               d3.selectAll(".c"+rORc+i) 
                 .filter(function(ce){
                    log2r.push(ce.value);
                  })
               ;
               if(rORc=="r"){ // sort log2ratio of a gene
                 sorted=d3.range(col_number).sort(function(a,b){ if(sortOrder){ return log2r[b]-log2r[a];}else{ return log2r[a]-log2r[b];}});
                 t.selectAll(".cell")
                   .attr("x", function(d) { return sorted.indexOf(d.col-1) * cellSize; })
                   ;
                 t.selectAll(".colLabel")
                  .attr("y", function (d, i) { return sorted.indexOf(i) * cellSize; })
                 ;
               }else{ // sort log2ratio of a contrast
                 sorted=d3.range(row_number).sort(function(a,b){if(sortOrder){ return log2r[b]-log2r[a];}else{ return log2r[a]-log2r[b];}});
                 t.selectAll(".cell")
                   .attr("y", function(d) { return sorted.indexOf(d.row-1) * cellSize; })
                   ;
                 t.selectAll(".rowLabel")
                  .attr("y", function (d, i) { return sorted.indexOf(i) * cellSize; })
                 ;
               }
          }

          d3.select("#order").on("change",function(){
            order(this.value);
          });
          
          function order(value){
           if(value=="hclust"){
            var t = svg.transition().duration(3000);
            t.selectAll(".cell")
              .attr("x", function(d) { return d.col * cellSize; })
              .attr("y", function(d) { return d.row * cellSize; })
              ;

            t.selectAll(".rowLabel")
              .attr("y", function (d, i) { return (i+1) * cellSize; })
              ;

            t.selectAll(".colLabel")
              .attr("y", function (d, i) { return (i+1) * cellSize; })
              ;

           }else if (value=="probecontrast"){
            var t = svg.transition().duration(3000);
            t.selectAll(".cell")
              .attr("x", function(d) { return (d.col - 1) * cellSize; })
              .attr("y", function(d) { return (d.row - 1) * cellSize; })
              ;

            t.selectAll(".rowLabel")
              .attr("y", function (d, i) { return i * cellSize; })
              ;

            t.selectAll(".colLabel")
              .attr("y", function (d, i) { return i * cellSize; })
              ;

           }else if (value=="probe"){
            var t = svg.transition().duration(3000);
            t.selectAll(".cell")
              .attr("y", function(d) { return (d.row - 1) * cellSize; })
              ;

            t.selectAll(".rowLabel")
              .attr("y", function (d, i) { return i * cellSize; })
              ;
           }else if (value=="contrast"){
            var t = svg.transition().duration(3000);
            t.selectAll(".cell")
              .attr("x", function(d) { return (d.col - 1) * cellSize; })
              ;
            t.selectAll(".colLabel")
              .attr("y", function (d, i) { return i * cellSize; })
              ;
           }
          }
          // 
          var sa=d3.select(".g3")
              .on("mousedown", function() {
                  if( !d3.event.altKey) {
                     d3.selectAll(".cell-selected").classed("cell-selected",false);
                     d3.selectAll(".rowLabel").classed("text-selected",false);
                     d3.selectAll(".colLabel").classed("text-selected",false);
                  }
                 var p = d3.mouse(this);
                 sa.append("rect")
                 .attr({
                     rx      : 0,
                     ry      : 0,
                     class   : "selection",
                     x       : p[0],
                     y       : p[1],
                     width   : 1,
                     height  : 1
                 })
              })
              .on("mousemove", function() {
                 var s = sa.select("rect.selection");
              
                 if(!s.empty()) {
                     var p = d3.mouse(this),
                         d = {
                             x       : parseInt(s.attr("x"), 10),
                             y       : parseInt(s.attr("y"), 10),
                             width   : parseInt(s.attr("width"), 10),
                             height  : parseInt(s.attr("height"), 10)
                         },
                         move = {
                             x : p[0] - d.x,
                             y : p[1] - d.y
                         }
                     ;
              
                     if(move.x < 1 || (move.x*2<d.width)) {
                         d.x = p[0];
                         d.width -= move.x;
                     } else {
                         d.width = move.x;       
                     }
              
                     if(move.y < 1 || (move.y*2<d.height)) {
                         d.y = p[1];
                         d.height -= move.y;
                     } else {
                         d.height = move.y;       
                     }
                     s.attr(d);
              
                         // deselect all temporary selected state objects
                     d3.selectAll('.cell-selection.cell-selected').classed("cell-selected", false);
                     d3.selectAll(".text-selection.text-selected").classed("text-selected",false);

                     d3.selectAll('.cell').filter(function(cell_d, i) {
                         if(
                             !d3.select(this).classed("cell-selected") && 
                                 // inner circle inside selection frame
                             (this.x.baseVal.value)+cellSize >= d.x && (this.x.baseVal.value)<=d.x+d.width && 
                             (this.y.baseVal.value)+cellSize >= d.y && (this.y.baseVal.value)<=d.y+d.height
                         ) {
              
                             d3.select(this)
                             .classed("cell-selection", true)
                             .classed("cell-selected", true);

                             d3.select(".r"+(cell_d.row-1))
                             .classed("text-selection",true)
                             .classed("text-selected",true);

                             d3.select(".c"+(cell_d.col-1))
                             .classed("text-selection",true)
                             .classed("text-selected",true);
                         }
                     });
                 }
              })
              .on("mouseup", function() {
                    // remove selection frame
                 sa.selectAll("rect.selection").remove();
              
                     // remove temporary selection marker class
                 d3.selectAll('.cell-selection').classed("cell-selection", false);
                 d3.selectAll(".text-selection").classed("text-selection",false);
              })
              .on("mouseout", function() {
                 if(d3.event.relatedTarget.tagName=='html') {
                         // remove selection frame
                     sa.selectAll("rect.selection").remove();
                         // remove temporary selection marker class
                     d3.selectAll('.cell-selection').classed("cell-selection", false);
                     d3.selectAll(".rowLabel").classed("text-selected",false);
                     d3.selectAll(".colLabel").classed("text-selected",false);
                 }
              });
              
        }
        
        var api_data;
        Data.get_local(attrs.url).success(function(api_data){
          api_data = draw_heatmap(api_data.data);
          drawChart(api_data);
        })
          
        scope.$watch(function() { return scope.threshold; }, function(value) {
          if(value && scope.tabledata) {
            drawChart(scope.tabledata);
          }
        }, true); 
      }
    };
});

function draw_heatmap(data){
  var chart_data = {
                headcolumnMiddle: [],
                headrow: [],
                values: []
            }
    for(var i=0; i<data.length; i++){
      for(var el in data[i]){
          chart_data.headrow.push(el)
          var obj=[];
          for(var j=0; j<data[i][el].length; j++){
            for(var val in data[i][el][j]){
              obj.push(data[i][el][j][val])
              chart_data.headcolumnMiddle.push(val);
            }
          }
          chart_data.values.push(obj)
        }
    }
    chart_data.headcolumnMiddle.splice(obj.length);
    return chart_data
}