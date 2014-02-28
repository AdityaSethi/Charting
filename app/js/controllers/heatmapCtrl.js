'use strict';

angular.module('app.controllers')
    .controller('heatmapCtrl', function($scope, Data){
    	
    	$scope.page = 'heatmap';
    	$scope.chartid = 'chart1';
    	
    	Data.get_local('lib/json/data.json').success(function(api_data){
    		$scope.draw_heatmap(api_data.data);
    	})
	
    	$scope.draw_heatmap = function(data){
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
		    $scope.heatmapdata = chart_data
		}

    });
