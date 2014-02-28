var colorsArray = ['#31A763','#7982B9','#F97848','#6298C4','#FDDE7F','#64BB63', '#0E229B', '#A4A1CC'];


angular.module('app.services').factory('Data',['$http', '$rootScope', 'Settings', '$modal', '$timeout', '$location', '$q', '$route', function ($http, $rootScope, Settings, $modal, $timeout, $location, $q, $route){

    var Data = {

        settings: Settings.get(),
        cache: {},
        add_data_to_cache:  function (base_url, api_data) {
            this.cache[base_url] = api_data;
            console.log('$$$$$$$$$ CACHE $$$$$$$$$$$');
            console.log(this.cache);
        },
        in_cache: function (base_url) {
            return this.cache[base_url] || null;
        },
        empty_cache: function () {
            console.log('$$$$$$$$$ CACHE EMPTIED $$$$$$$$$$$');
            this.cache = {};
        },

        get_query_params : function (){
            var settings = this.settings;
            return 'origin=' + settings.origin + '&' +
                'dest=' + settings.destination + '&' +
                'from_date=' + settings.startTime + '&' +
                'to_date=' + settings.endTime;
        },

        update_progress: function(){
            var that = this;
            var start_location = $location.path();
            var modal_instance = $modal.open({templateUrl:'/views/modal_content.html',
                backdrop: 'static', keyboard: false });

            (function tick() {
                var progress = that.get_progress().success(function(api_progress_value){
                    if (!api_progress_value.res || api_progress_value.res.percent ===100){
                        $timeout.cancel(stop);
                        modal_instance.close();
                        $rootScope.job_progress = false;
                        $location.path(start_location);
                        that.get_settings();
                    }else{
                        var pr = api_progress_value.res.percent
                        $rootScope.message = api_progress_value.res.message;
                        var type;
                        if (pr < 25) {
                            type = 'success';
                        } else if (pr < 50) {
                            type = 'info';
                        } else if (pr < 75) {
                            type = 'warning';
                        } else {
                            type = 'danger';
                        };
                        $rootScope.dynamicObject = {
                            value: pr,
                            type: type
                        };
                        $timeout(tick, 1000);
                    }
                });
            })();
        },

        get_settings: function(){
            return this.get_base_json('settings/get').success(function(api_data){
                console.log(api_data);
                var settings = Settings.get();
                settings.airline = api_data.response.airline;
                settings.airlines = api_data.response.airlines;
                settings.origin = api_data.response.origin;
                settings.destination = api_data.response.dest;
                settings.startTime = api_data.response.from_date;
                settings.endTime = api_data.response.to_date;
                settings.bookingPriorToDeparture = api_data.response.ap + ' Days';
                settings.lengthOfStay = api_data.response.length_of_stay + ' Days';
                settings.booksOnWeekend = api_data.response.weekend ? 'true' : 'false';
                $route.reload();
            });
        },

        get_plain_query_url: function (path){
            return this.settings.base_url+'/api/'+path;
        },

        get_query_url:  function (path){
            return this.get_plain_query_url(path)+'?'+this.get_query_params();
        },

        get_base_json: function(path){
            var url_calling = this.get_plain_query_url(path);
            return this.get_promise(url_calling)
        },

        get_promise: function(url_calling){
            console.log(url_calling);
            window.recent_api_url = url_calling
            var base_url = url_calling.split('?')[0], cached_data, promise;
            cached_data = this.in_cache(base_url);
            if(cached_data && base_url != '/api/bkg_progress') {
                console.log('$$$$$$$$ FOUND IN CACHE $$$$$$$$$');
                promise = {
                    success: function(callback){
                        callback(cached_data);
                    }
                }
            } else {
                promise = $http.get(url_calling).success(function(api_response){
                    window.recent_api_response = api_response
                });   
                var that = this;
                promise.success(function(api_data){
                    if(base_url != '/api/bkg_progress') {
                        that.add_data_to_cache(base_url, api_data)
                    }
                }); 
            }
             
            if(promise.error) {
                promise.error(function(data, status){
                    if(status == 303){
                        console.log('Status 303, starting progress bar...')
                        $rootScope.job_progress = true;
                    }
                });
            }
            return promise
        },

        get_progress: function(){
            return this.get_base_json('bkg_progress');
        },

        get_json: function(url_part){
            return this.get_promise(this.get_query_url(url_part));
        },

        new_get_json :  function(url_part){
            var that = this;
            if ($rootScope.hasOwnProperty('settings')){
                console.log('Has settings already.');
                return this.get_promise(this.get_query_url(url_part));
            } else {
                var deferred = $q.defer();
                my_promise = $q.when(that.get_settings()).then(function(settings)
                {
                    var my_query_url = that.get_query_url(url_part);
                    console.log('my Q URL'+my_query_url+'Settings:'+settings);
                    return that.get_promise(my_query_url).success(function(api_data){
                        console.log('Api_data'+api_data);
                        return deferred.resolve(api_data);
                    }).error(function(data, status){
                        if(status == 303) {
                            $rootScope.job_progress = true;
                        }
                    })
                })
                my_promise.success = my_promise.then
                return my_promise.promise
            }
        },

        post_json :  function(url_part, postData){
            var url_calling = '/api/' + url_part;
            console.log(url_calling);
            var promise = $http.post(url_calling, postData)
            promise.error(function(data, status){
                if(status == 303){
                    console.log('Status 303, starting progress bar...')
                    $rootScope.job_progress = true;
                }
            });
            this.empty_cache();

            return promise
        },

        post_csv : function(url_part, postData){
            var promise = $http({
                url: url_part,
                method: 'POST',
                data: {file: postData},
                headers: {
                    'Content-Type': 'multipart/form-data'
                }

            }).success(function(response){
                console.log(response)
            }).error(function(error){
                console.log(error)
            });

            return promise;
        },

        get_local: function(path){
            return this.get_promise(path);
        },

        get_graph_series: function (each_api_data, chart_label, api_label, y_label){
            var d = _.toArray(each_api_data);
            for (var j in d){
                d[j][chart_label] = +d[j][api_label] || j;
                d[j]['y'] = +(d[j][y_label]).toFixed(1);
            }
            return d
        },

        get_graph_series_from_obj: function (each_api_data, chart_label, api_label, y_label){
            var d = _.toArray(each_api_data);
            var d_keys = _.keys(each_api_data);
            for (var j in d){
                d[j][chart_label] = +d_keys[j];
                d[j]['y'] = +(d[j][y_label]).toFixed(1);
            }
            return d
        },

        set_y: function(series_data, y_label){
            var d = _.toArray(series_data);
            for (var j in d){
              d[j]['y'] = +(d[j][y_label]).toFixed(1);
            }
            return angular.copy(d)
        },

        get_keys: function(series_data){
            return _.keys(series_data);
        },
        get_names: function(series_data){
          return _.map(series_data,function(x){return x.name})
        },
        get_forward_backward: function(api_data,compare,cluster,category,yaxis){
            var base_json = api_data.res[compare][cluster];
            var forward_json = base_json['forward'][category];
            var backward_json = base_json['backward'][category];
            console.log(forward_json);
            var series = [
                        {
                            name: 'forward',
                            color: colorsArray[0],
                            data: this.get_graph_series_from_obj(forward_json,'x','',yaxis)
                        },
                        {
                            name: 'backward',
                            color: colorsArray[1],
                            data: this.get_graph_series_from_obj(backward_json,'x','',yaxis)
                        }
                    ]
            return series
        },
        get_serieses: function(api_data,choices,options){
            var series_json = api_data;
            console.log(choices);
            for (var el in choices){
                series_json = series_json[choices[el]];
            }
            var computed_series = [];
            for (var el in series_json){
                var this_series = {
                    name: el,
                    data: series_json[el]
                }
                if (options.hasOwnProperty(el)){
                    var series_option = options[el];
                    this_series = $.extend(false, this_series, series_option);
                    if (series_option.hasOwnProperty('data')){
                        var sdata = series_json[el]
                        for (var fn in series_option.data){
                            sdata = series_option.data[fn](sdata)
                        }
                        this_series.data = sdata;
                    }
                }
                computed_series.push(this_series);
            }
            console.log(computed_series);
            return computed_series;
        },

        x_date: function(series_data){
            for (var el in series_data){
                var sd = series_data[el];
                d = new Date(sd.x);
                var utc_date = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
                series_data[el].x = utc_date;
            }
            return series_data
        },

        red_negative: function(series_data){
//            var series_data1 = Data.x_date(series_data);
            for (var el in series_data){
                if (series_data[el].y<0){
                    series_data[el].color = '#FBAD71'
                }
            }
            return series_data;
        },

        transform_api : function(api_data){

            var mod_data = angular.copy(api_data);
            var r = mod_data.res

            for (var op1 in r){
                for (var op2 in r[op1]){
                    var kpi = {}
                    for (var year in r[op1][op2]){
                        kpi[year] = angular.copy(r[op1][op2][year]);
                    }

                }
            }
            return mod_data
        }

}
    return Data;
}])

.factory('FileReader', function($q, $log){
    var onLoad = function(reader, deferred, scope) {
            return function () {
                scope.$apply(function () {
                    deferred.resolve(reader.result);
                });
            };
        };
 
        var onError = function (reader, deferred, scope) {
            return function () {
                scope.$apply(function () {
                    deferred.reject(reader.result);
                });
            };
        };
 
        var onProgress = function(reader, scope) {
            return function (event) {
                scope.$broadcast("fileProgress",
                    {
                        total: event.total,
                        loaded: event.loaded
                    });
            };
        };
 
        var getReader = function(deferred, scope) {
            var reader = new FileReader();
            reader.onload = onLoad(reader, deferred, scope);
            reader.onerror = onError(reader, deferred, scope);
            reader.onprogress = onProgress(reader, scope);
            return reader;
        };
 
        var readAsDataURL = function (file, scope) {
            var deferred = $q.defer();
             
            var reader = getReader(deferred, scope);         
            reader.readAsDataURL(file);
             
            return deferred.promise;
        };
 
        return {
            readAsDataUrl: readAsDataURL  
        };
});

angular.module('app.services').factory('DefaultChartOptions', [function(){
    var defaultChartOptions = {

        "chart": {
            "style": {
                "fontFamily": 'TitilliumWeb',
                "fontSize": '12px',
                "color": "#666"
            }
        },
        "xAxis": {
             lineColor: '#aaa',
             title: { align: 'middle'},
             "labels": {
                 "style": {
                    "color": "#666",
                    "fontFamily": "TitilliumWeb",
                    "fontSize": "12px"
                },
                "verticalAlign": "middle"
            }
        },
        "yAxis": {
             "lineColor": "#aaa",
             "labels": {
                "style": {
                    "color": "#666",
                    "fontFamily" : "TitilliumWeb",
                    "fontSize": "12px"
                }
            },
            "title": {
                align: 'middle',
                "style":{
                    "color": "#666",
                    "fontFamily" : "TitilliumWeb",
                    "fontSize": "12px",
                    "fontWeight": 100
                }
            },
            "maxPadding": 0,
            "alternateGridColor": false,
            "gridLineWidth": 0,
            "minTickInterval": 20
        },
//        tooltip: {
//            enabled: true,
//            formatter: function() {
//                return '<b>'+this.y+'</b>';
//            }
//        },
        "plotOptions": {
        },
        "credits" : {
            "enabled": false
        },
        "legend": {
            itemMarginBottom: 7,
            itemStyle: {
                    color: '#666',
                    fontFamily: 'TitilliumWeb',
                    fontSize: '13px'
            }
        }
    };

    return defaultChartOptions;
}]);

angular.module('app.services').factory('ChartOptions', ['DefaultChartOptions', function (defaultChartOptions){

    booking_curve_chart = {

        "chart": {
            "type": "spline",
            marginTop: 75
        },
        legend: {
            enabled: true,
            layout: 'horizontal',
            align: 'right',
            verticalAlign: 'top',
            floating: true,
            y:-20,
            borderWidth:0
        },
        "title": {
            "text": ''
        },
        "subtitle": {
            "text": ''
        },
        tooltip: {
            enabled: true,
            formatter: function() {
                return '<b>' + this.x + ' days: ' + this.y.toFixed(1) + '%</b>';
            }
        },
        plotOptions: {
            series: {
                marker: {
                    radius: 4,
                    symbol: "circle"
                }
            }
        },
        xAxis:{
            gridLineWidth: 0,
            tickLength: 0,
            allowDecimals: false,
            categories: [],
            title: { text: 'Reading Days', align: 'middle',
                style: {color: '#666',
                    fontWeight: 'normal'}
            },
            min: 0,
            max: 63, //9 weeks, as suggested by Carlos.
            tickInterval: 7,
            labels:{
                format: '{value}'
            },
            type:'number'
        },
        "credits" : {
            "enabled": false
        },
        yAxis:{
            title: {text: ''},
            min: 0,
            max: 100,
            tickLength: 0,
            gridLineWidth: 0,
            plotLines: [{
                value: 0,
                width: 0,
                color: '#000'
            }]
        }
    };

    cluster ={};
    cm_chart = {};
    angular.copy(booking_curve_chart,cluster);
    angular.copy(booking_curve_chart,cm_chart);
    cm_chart.tooltip = {
        enabled: true,
        formatter: function(){
            return '<b>' + this.y.toFixed(1) +'</b>';
        }
    }
    cluster.xAxis.labels.format = '{value}'

    var BCC = {

        pos: $.extend(true, booking_curve_chart, defaultChartOptions),
        cluster_chart: $.extend(true, cluster, defaultChartOptions),
        channel_mix_chart : cm_chart
    };


    return BCC
}]);
angular.module('app.services').factory('LOSChart', ['DefaultChartOptions', function (defaultChartOptions){

    los_chart = {

        "chart": {
            "type": "column"
        },
        xAxis:{
            gridLineWidth: 0,
            tickLength: 0,
            allowDecimals: false,
            categories: [''],
            title: { text: 'Days', align: 'high',
                style: {color: '#666',
                    fontWeight: 'normal'}
            },
            labels:{
                format: '{value}'
            },
            type:'category'
        },
        yAxis:{
            title: {text: ''},
            min: 0
        },
        tooltip: {
            enabled: true,
            formatter: function() {
                return '<b>'+this.y+'</b>';
            }
        },
        legend:{
            enabled: false
        },
        "title": {
            "text": ''
        }

    };

    cluster ={};
//    angular.copy(booking_curve_chart,cluster)
//    cluster.xAxis.labels.format = '{value}'

    var BCC = {

        pax: $.extend(true, los_chart, defaultChartOptions),
        cluster_chart: $.extend(true, cluster, defaultChartOptions)

    };


    return BCC
}]);

angular.module('app.services').factory('ControlTowerChart', ['DefaultChartOptions', function (defaultChartOptions){

    ctc_options = {

        chart: {
            type: "spline"
        },

        legend: {
            enabled: true,
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'top',
            y:-20,
            borderWidth:0
        },
        "title": {
            "text": ''
        },
        "subtitle": {
            "text": ''
        },
        tooltip: {
            enabled: true,
            formatter: function() {
                return '<b>' + this.series.name + " "+this.x + ' weeks: ' +this.y.toFixed(1) + '</b>';
            }
        },
        plotOptions: {
            series: {
                marker: {
                    radius: 4,
                    symbol: "circle",
                    enabled: false
                }
            }
        },
        xAxis:{
            title: { text: 'Weeks', align: 'middle',
                style: {color: '#666',
                    fontWeight: 'normal'}
            },
            labels:{
                format: '{value}'
            },
            type:'number'
//            categories: _.range(54)
        },
        "credits" : {
            "enabled": false
        },
        yAxis:{
            title: {text: ''}
        }
    };


    return $.extend(true,ctc_options,defaultChartOptions)

}]);

angular.module('app.services').factory('ForwardChart', ['DefaultChartOptions', function (defaultChartOptions){

    ctc_options = {

        chart: {
            type: "spline",
            marginTop: 50
        },
        legend: {
            enabled: true,
            layout: 'horizontal',
            align: 'right',
            verticalAlign: 'top',
            y:-10,
            borderWidth:0,
            floating: true
        },
        plotOptions: {
            series: {
                marker: {
                    radius: 4,
                    symbol: "circle"
                }
            }
        },
        "title": {
            "text": ''
        },
        "subtitle": {
            "text": ''
        },
        tooltip: {
            useHTML: true,
            enabled: true,
            formatter: function() {
                return '<b>' + this.series.name + "  "  +this.y.toFixed(1) + '</b>';
            },
            style: {
                padding: 5
            }
        },
        xAxis:{
            title: { text: 'Reading Days', align: 'middle',
                style: {color: '#666',
                    fontWeight: 'normal'}
            },
            min: 0,
            max: 84,
            tickLength: 0,
            startOnTick: true,
            endOnTick: true,
            labels:{
                format: '{value}'
            },
            type:'number',
            tickInterval: 7
        },
        "credits" : {
            "enabled": false
        },
        yAxis:[
                { // Primary yAxis
                    startOnTick: true,
                    labels: {
                        style: {
                            fontSize: 11
                        },
                        format: '{value:.1f}'
                    },
                    title: {
                        text: ''
                    },
                    min: 0,
                    //max: 100.0,
                    maxPadding: 0,
                    minPadding:0,
                    tickLength: 0,
                    gridLineWidth: 0,
                    lineColor : "#666666"
                }, { // Secondary yAxis
                    startOnTick: true,
                    labels: {
                        style: {
                            fontSize: 10
                        },
                        format: '{value:.1f}'
                    },
                    tickLength: 0,
//                    tickInterval:10,
                    gridLineWidth: 0,
                    lineColor : "#666666",
                    startOnTick: false,
                    opposite: true,
                    showEmpty: false,
                    title: {
                            text: "% Difference",
                            style: {
                                fontSize: '12px',
                                fontWeight: 'normal',
                                fontFamily: 'TitilliumWebSemiBold'
                            }
                        }
                    }
        ]
    };

    var defaultChartOptionsCopy = $.extend(true, {}, defaultChartOptions);
    return $.extend(true, defaultChartOptionsCopy, ctc_options)

}]);

angular.module('app.services').factory('PostedFlightsChartOptions', ['DefaultChartOptions', function (defaultChartOptions){

    var posted_flight_bar_chart = {

         chart: {
                type: 'bar'
            },
            title: {
                text: ''
            },
            subtitle: {
                text: ''
            },
            xAxis: {
                categories: [],
                title: {
                    text: null
                },
                tickLength: 0,
                "lineWidth": 0
            },
            yAxis: {
                min: 0,
                "lineWidth": 1,
                "lineColor": "#666",
                title:{
                    text: "Number of Posted Flights"
                },
                labels: {
                    overflow: 'justify'
                }
            },
            tooltip: {
                enabled: false
            },
            plotOptions: {
                bar: {
                    dataLabels: {
                        enabled: true,
                        useHTML: true,
                         formatter: function() {
                            return '<span class="orange dataLabel">'+ this.point.posted_percent.toFixed(1) +'</span>'+
                                '|<span class="brown dataLabel">'+ this.point.total_percent.toFixed(1) + '</span>';
                        }
                    },
                    pointWidth: 22
                }
            },
            legend: {
                enabled: false,
                layout: 'horizontal',
                align: 'right',
                verticalAlign: 'top',
                x: -40,
                y: 100,
                floating: true,
                borderWidth: 0,
                backgroundColor: '#FFFFFF',
                shadow: false
            },
             tooltip: {
                formatter: function() {
                    return '<b>'+ Math.round(this.y) +'</b>';
                }
            },
            credits: {
                enabled: false
            },
            series: [{
                color: "blue",
                data: []
            }]
}
    var BCC = {

        pos: $.extend(true, posted_flight_bar_chart, defaultChartOptions)

    };


    return BCC
}]);

angular.module('app.services').factory('PriceScrapingChartOptions', ['DefaultChartOptions', function (defaultChartOptions){

    var chartOptions = {

         chart: {
                type: 'bar'
            },
            title: {
                text: ''
            },
            subtitle: {
                text: ''
            },
            xAxis: {
                categories: [],
                title: {
                    text: null
                },
                tickLength: 0,
                "lineWidth": 0
            },
            yAxis: {
                min: 0,
                "lineWidth": 1,
                "lineColor": "#666",
                title:{
                    text: "Number of Posted Flights"
                },
                labels: {
                    overflow: 'justify'
                }
            },
            tooltip: {
                enabled: false
            },
            plotOptions: {
                bar: {
                    dataLabels: {
                        enabled: true,
                        useHTML: true,
                         formatter: function() {
                            return '<span class="orange dataLabel">'+ this.point.posted_percent.toFixed(1) +'</span>'+
                                '|<span class="brown dataLabel">'+ this.point.total_percent.toFixed(1) + '</span>';
                        }
                    },
                    pointWidth: 22
                }
            },
            legend: {
                enabled: false,
                layout: 'horizontal',
                align: 'right',
                verticalAlign: 'top',
                x: -40,
                y: 100,
                floating: true,
                borderWidth: 0,
                backgroundColor: '#FFFFFF',
                shadow: true
            },
             tooltip: {
                formatter: function() {
                    return '<b>'+ Math.round(this.y) +'</b>';
                }
            },
            credits: {
                enabled: false
            },
            series: [{
                color: "blue",
                data: []
            }]
}
    var chart = {

        priceScraping: $.extend(true, chartOptions, defaultChartOptions)

    };


    return chart;
}]);


angular.module('app.services').factory('ChartOptionsFinancialKPI',['DefaultChartOptions', function (defaultChartOptions){

    fin_kpi_chart = {

        "chart": {
            "zoomType": "xy"
        },
        legend: {
            enabled: false
        },
        "title": {
            "text": ''
        },
        "subtitle": {
            "text": ''
        },

        tooltip: {
            enabled: true,
            formatter: function() {
                return '<b>' + addComma(this.y.toFixed(1)) + '</b>';
            }
        },
        xAxis:{
            categories: [],
            gridLineWidth: 0,
            lineColor : "#666666",
            labels: {
                style: {
                    fontSize: 10
                }
            }
        },
        "credits" : {
            "enabled": false
        },
        plotOptions: {
            series: {
                marker: {
                    radius: 4,
                    symbol: "circle"
                }
            },
            column: { minPointLength: 2 }
        },
        yAxis:[
            { // Primary yAxis
                labels: {
                    style: {
                        fontSize: 10
                    }
                },
                title: {
                    text: '',
                }
            }, { // Secondary yAxis
                title: {
                    text: 'Difference',
                },
                labels: {
                    style: {
                        fontSize: 10
                    }
                },
                opposite: true
            }
        ],
        series: []
    }


    var BCC = {

        pos: $.extend(true, fin_kpi_chart, defaultChartOptions)

    }


    return BCC;
}]);

angular.module('app.services').factory('PieChartOptions',[function ($http){

    traffic_comp_pie_chart = {

        chart: {
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false
        },
        title: {
            text: '',
            style: {
                fontSize: 12,
                color: "#777"
            }
        },
        tooltip: {
            pointFormat: '<b>{point.percentage:.1f}%</b>'
        },
        credits: {
            enabled: false
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false,
                    color: '#000000',
                    connectorColor: '#000000',
                    format: '{point.percentage:.1f} %'
                }
            }
        },
        series: [{
            type: 'pie',
            data: []
        }]
        
    }


    var BCC = {

        pos: traffic_comp_pie_chart

    }
    return BCC;
}]);

angular.module('app.services').factory('StackChartOptions',[function (){

  traffic_comp_stack_chart = {

    chart: {
      type: 'column'
    },
    title: {
      text: ''
    },
    xAxis: {
      lineColor: 'white',
      categories: [],
      labels: {
        enabled: false,
        y: 20
      }
    },
    credits: {
      enabled: false
    },
    yAxis: {
      min: 0,
      gridLineWidth: 0,
      title: {
        text: ''
      },
      labels: {
        enabled: false
      },
      stackLabels: {
        enabled: true,
        style: {
          fontWeight: 'bold',
          color: (Highcharts.theme && Highcharts.theme.textColor) || 'white'
        }
      }
    },
    legend: {
      enabled: false
    },
    tooltip: {
      enabled: false
    },
    plotOptions: {
      column: {
        stacking: 'normal',
        dataLabels: {
          enabled: true,
          x: 70,
          color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'black',
          formatter: function() {
            return ''+ this.y.toFixed(1) +' % '+
              this.series.name;
          }
        }
      }
    },
    series: []
  }


  var BCC = {

    pos: traffic_comp_stack_chart

  }
  return BCC;
}]);

angular.module('app.services').factory('MultiSeriesMultiAxis',function (DefaultChartOptions){

  cmr = {

    chart: {
      type: 'column'
    },
    title: {
      text: ''
    },
    xAxis: {
      categories: []
    },
    credits: {
      enabled: false
    },
    yAxis: [
      { // Primary yAxis
        labels: {
          style: {
            fontSize: 10
          }
        },
        min: 0,
        title: {
          text: 'Percentage'
        },
        tickLength: 1,
        gridLineWidth: 0,
        lineColor : "#666666"
      }, { // Secondary yAxis
        title: {
          text: 'Avg. Revenue'
        },
        labels: {
          style: {
            fontSize: 10
          }
        },
        tickLength: 1,
        gridLineWidth: 0,
        lineColor : "#666666",
//        startOnTick: false,
        opposite: true
      }],
  legend:   {
    align: 'right',
    verticalAlign: 'top',
    layout: 'vertical',
    x: 0,
    y: 0,
    itemMarginTop: 5,
    itemMarginBottom: 5
  },
  plotOptions : {
    column:{
      pointPadding: 0,
      dataLabels: {
        enabled: true,
        formatter: function() {
          return this.point.y.toFixed(1);
        },
//        x: 5
      }
    }
  },
    series: []
  };

  return {
    cmr : cmr
  }

});

angular.module('app.services').factory('StackColumnChartOptions',['DefaultChartOptions', function (defaultChartOptions){

    shareIndex = {

        chart: {
                type: 'column'
            },
            title: {
                text: ''
            },
            legend: {
                enabled: true,
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'top',
                //y: -15,
                borderWidth:0
            },
            xAxis: {
                 lineColor: '#aaa',
                categories: [],
                labels: {
                    y: 20
                }
            },
            yAxis: {
                min: 0,
                gridLineWidth: 0,
                title: {
                    text: ''
                },
                labels: {
                    enabled: true
                }
            },
            tooltip: {
                formatter: function() {
                    return '<b>'+ this.y.toFixed(1) +'</b>';
                }
            },
            plotOptions: {
                column: {
                    stacking: 'normal',
                    dataLabels: {
                        enabled: false
                    }
                }
            },
            series: []
    }


    var BCC = {

        pos: $.extend(true, shareIndex, defaultChartOptions)

    }
    return BCC;
}]);

angular.module('app.services').factory('BubbleChartOptions',['DefaultChartOptions', function (defaultChartOptions){

    fareStructure = {

            chart: {
                type: 'scatter',
                marginTop: 120,
                marginRight: 50
            },
            title: {
                text: ''
            },
            subtitle: {
                text: ''
            },
            xAxis: {
                categories: [],
                title: {
                    enabled: false
                },
                showLastLabel: true
            },
            yAxis: {
                title: {
                    text: ''
                },
                "gridLineWidth": 1
            },
            legend: {
                enabled: true,
                align: 'right',
                verticalAlign: 'top',
                borderWidth:0
            },
            plotOptions: {
                series: {
                    marker: {
                        radius: 5,
                        symbol: "circle"
                    }
                },
                scatter: {
                    dataLabels: {
                        x: 25,
                        y: 10,
                        enabled: true,
                        useHTML: true,
                        formatter: function() {
                            return '<span class="dataLabel">' + 
                            this.y + 
                            '</span>';
                        }
                    },
                    pointWidth: 22
                
                }
            },
            tooltip: { enabled: true,
                       useHTML: true,
                        formatter: function() {
                            var text = '<b>AP: </b>' + 
                            this.point.ap;

                            if(this.point.los != null){
                                text = text + '  ' + '<b>Min Stay: </b>' + this.point.los;
                            }
                            return text;
                        } 
                    },
            series: [{name: 'OW', color: "#6298C4", data: [], dataLabels: {color: "#6298C4"}}, //OW Bubbles 
                {name: 'RT', color: "#CB1A19", data: [], dataLabels: {color: "#CB1A19"}} //RT Bubbles
                ]
    }


    var BCC = {

        fareStructure: $.extend(true, fareStructure, defaultChartOptions)

    }
    return BCC;
}]);
