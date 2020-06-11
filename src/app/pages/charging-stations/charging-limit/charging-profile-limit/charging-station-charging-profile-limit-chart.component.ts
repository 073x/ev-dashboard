import * as moment from 'moment';

import { ChargePoint, ChargingStation, ChargingStationPowers, Connector } from 'app/types/ChargingStation';
import { Chart, ChartColor, ChartData, ChartDataSets, ChartOptions, ChartPoint, ChartTooltipItem } from 'chart.js';
import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';

import { AppDatePipe } from 'app/shared/formatters/app-date.pipe';
import { AppDecimalPipe } from '../../../../shared/formatters/app-decimal-pipe';
import { AppDurationPipe } from 'app/shared/formatters/app-duration.pipe';
import { ConsumptionUnit } from 'app/types/Transaction';
import { LocaleService } from 'app/services/locale.service';
import { Schedule } from 'app/types/ChargingProfile';
import { TranslateService } from '@ngx-translate/core';
import { Utils } from 'app/utils/Utils';

@Component({
  selector: 'app-charging-station-smart-charging-limit-planner-chart',
  template: `
    <div>
      <div class="btn-group mat-button-group">
        <app-chart-unit-selector (unitChanged)="unitChanged($event)"></app-chart-unit-selector>
      </div>
    </div>
    <div class="chart-container" style="position: relative; height:27vh;">
      <div #primary class='chart-primary'></div>
      <div #danger class='chart-danger'></div>
      <canvas #chart></canvas>
    </div>
  `,
})
export class ChargingStationSmartChargingLimitPlannerChartComponent implements OnChanges {
  @Input() public ratio!: number;
  @Input() public chargingStation!: ChargingStation;
  @Input() public connectorId!: number;
  @Input() public chargingSchedules: Schedule[];

  @ViewChild('primary', { static: true }) public primaryElement!: ElementRef;
  @ViewChild('danger', { static: true }) public dangerElement!: ElementRef;
  @ViewChild('chart', { static: true }) public chartElement!: ElementRef;


  public selectedUnit = ConsumptionUnit.KILOWATT;

  private graphCreated = false;
  private chart!: Chart;
  private options!: ChartOptions;
  private data: ChartData = {
    labels: [],
    datasets: [],
  };
  private language!: string;
  private instantPowerColor!: string;
  private limitColor!: string;
  private defaultColor!: string;
  private lineTension = 0;

  constructor(
    private translateService: TranslateService,
    private durationPipe: AppDurationPipe,
    private localeService: LocaleService,
    private datePipe: AppDatePipe,
    private decimalPipe: AppDecimalPipe) {
    this.localeService.getCurrentLocaleSubject().subscribe((locale) => {
      this.language = locale.language;
    });
  }

  public ngOnChanges() {
    this.prepareAndCreateGraphData();
  }

  private getStyleColor(element: Element): string {
    const style = getComputedStyle(element);
    return style && style.color ? style.color : '';
  }

  public unitChanged(key: ConsumptionUnit) {
    this.selectedUnit = key;
    this.prepareAndCreateGraphData();
  }

  private prepareOrUpdateGraph() {
    if (!this.graphCreated) {
      this.graphCreated = true;
      // Get colors
      this.instantPowerColor = this.getStyleColor(this.primaryElement.nativeElement);
      this.limitColor = this.getStyleColor(this.dangerElement.nativeElement);
      this.defaultColor = this.getStyleColor(this.chartElement.nativeElement);
      // Build chart options
      this.options = this.createOptions();
      // Create Chart
      this.chart = new Chart(this.chartElement.nativeElement.getContext('2d'), {
        type: 'bar',
        data: this.data,
        options: this.options,
      });
    }
    this.chart.update();
  }

  private prepareAndCreateGraphData() {
    // Init
    this.prepareOrUpdateGraph();
    // Create chart
    if (this.data && this.data.datasets && this.data.labels) {
      this.data.labels = [];
      this.data.datasets = [];
      // Fill
      this.createGraphData();
    }
  }

  // tslint:disable-next-line: cyclomatic-complexity
  private createGraphData() {
    // Clear
    if (this.data && this.data.datasets && this.data.labels) {
      const labels: number[] = [];
      const datasets: ChartDataSets[] = [];
      // Build Charging Plan dataset
      const chargingSlotDataSet: ChartDataSets = {
        type: 'line',
        data: [],
        yAxisID: 'power',
        lineTension: this.lineTension,
        ...Utils.formatLineColor(this.instantPowerColor),
        label: this.translateService.instant((this.selectedUnit === ConsumptionUnit.AMPERE) ?
          'transactions.graph.plan_amps' : 'transactions.graph.plan_watts'),
      };
      // Build Schedules
      for (const chargingSlot of this.chargingSchedules) {
        // Add a point
        if (this.data.labels && chargingSlotDataSet.data) {
          labels.push(chargingSlot.startDate.getTime());
          chargingSlotDataSet.data.push({
            x: chargingSlot.startDate.getTime(),
            y: chargingSlot.limitInkW,
          } as number & ChartPoint);
        }
      }
      let connector: Connector;
      let chargePoint: ChargePoint;
      let chargingStationPowers: ChargingStationPowers;
      if (this.connectorId > 0) {
        connector = Utils.getConnectorFromID(this.chargingStation, this.connectorId);
        chargePoint = Utils.getChargePointFromID(this.chargingStation, connector.chargePointID);
        chargingStationPowers = Utils.getChargingStationPowers(this.chargingStation, chargePoint, this.connectorId);
      } else {
        chargingStationPowers = Utils.getChargingStationPowers(this.chargingStation);
      }
      // Create the last point with the duration
      if (chargingSlotDataSet.data && this.chargingSchedules.length > 0) {
        const chargingSlot = this.chargingSchedules[this.chargingSchedules.length - 1];
        labels.push(chargingSlot.startDate.getTime() + chargingSlot.duration * 60 * 1000);
        chargingSlotDataSet.data.push({
          x: chargingSlot.startDate.getTime() - 1000 + chargingSlot.duration * 60 * 1000,
          y: chargingSlot.limitInkW,
        } as number & ChartPoint);
      }
      if (this.selectedUnit === ConsumptionUnit.AMPERE) {
        for (const chartPoint of chargingSlotDataSet.data as ChartPoint[]) {
          if (chargePoint) {
            chartPoint.y = Utils.convertWattToAmp(this.chargingStation, chargePoint, this.connectorId, (chartPoint.y as number) * 1000);
          } else {
            chartPoint.y = Utils.convertWattToAmp(this.chargingStation, null, this.connectorId, (chartPoint.y as number) * 1000);
          }
        }
      }
      // Push in the graph
      datasets.push(chargingSlotDataSet);
      // Build Max Limit dataset
      const limitDataSet: ChartDataSets = {
        name: 'limitWatts',
        type: 'line',
        data: [],
        yAxisID: 'power',
        lineTension: this.lineTension,
        ...Utils.formatLineColor(this.limitColor),
        label: this.translateService.instant((this.selectedUnit === ConsumptionUnit.AMPERE) ?
          'transactions.graph.limit_plan_amps' : 'transactions.graph.limit_plan_watts'),
      };
      // Add points
      if (limitDataSet.data && chargingSlotDataSet.data && chargingSlotDataSet.data.length > 0) {
        // First
        limitDataSet.data.push({
          x: (chargingSlotDataSet.data[0] as ChartPoint).x,
          y: chargingStationPowers.currentWatt / 1000,
        } as number & ChartPoint);
        // Last
        limitDataSet.data.push({
          x: (chargingSlotDataSet.data[chargingSlotDataSet.data.length - 1] as ChartPoint).x,
          y: chargingStationPowers.currentWatt / 1000,
        } as number & ChartPoint);
      }
      if (this.selectedUnit === ConsumptionUnit.AMPERE) {
        for (const chartPoint of limitDataSet.data as ChartPoint[]) {
          if (chargePoint) {
            chartPoint.y = Utils.convertWattToAmp(this.chargingStation, chargePoint, this.connectorId, (chartPoint.y as number) * 1000);
          } else {
            chartPoint.y = Utils.convertWattToAmp(this.chargingStation, null, this.connectorId, (chartPoint.y as number) * 1000);
          }
        }
      }
      // Push in the graph
      datasets.push(limitDataSet);
      // Assign
      this.data.labels = labels;
      this.data.datasets = datasets;
      // Update
      this.chart.update();
    }
  }

  private createOptions(): ChartOptions {
    const locale = moment.localeData(this.language);
    const options: ChartOptions = {
      animation: {
        duration: 0,
      },
      legend: {
        display: true,
        position: 'bottom',
      },
      responsive: true,
      maintainAspectRatio: this.ratio ? true : false,
      aspectRatio: this.ratio,
      tooltips: {
        bodySpacing: 5,
        mode: 'index',
        position: 'nearest',
        multiKeyBackground: Utils.toRgba(this.instantPowerColor, 0.7),
        intersect: false,
        callbacks: {
          labelColor: (tooltipItem: ChartTooltipItem, chart: Chart) => {
            return {
              borderColor: 'rgba(0,0,0,0)',
              backgroundColor: this.data.datasets && tooltipItem.datasetIndex ?
                this.data.datasets[tooltipItem.datasetIndex].borderColor as ChartColor : '',
            };
          },
          label: (tooltipItem: ChartTooltipItem, data: ChartData) => {
            if (data.datasets && tooltipItem.datasetIndex !== undefined) {
              const dataSet = data.datasets[tooltipItem.datasetIndex];
              if (dataSet && dataSet.data && tooltipItem.index !== undefined) {
                const chartPoint = dataSet.data[tooltipItem.index] as ChartPoint;
                if (chartPoint) {
                  const value = chartPoint.y as number;
                  if (this.selectedUnit === ConsumptionUnit.AMPERE) {
                    return ' ' + this.decimalPipe.transform(value, '2.0-0') + 'A';
                  }
                  return ' ' + this.decimalPipe.transform(value, '2.2-2') + 'kW';
                }
              }
            }
            return '';
          },
          title: (item: ChartTooltipItem[], data: ChartData) => {
            if (data.labels) {
              const firstDate = new Date(data.labels[0] as number);
              if (item[0].index !== undefined) {
                const currentDate = new Date(data.labels[item[0].index] as number);
                return this.datePipe.transform(currentDate) + ' - ' +
                  this.durationPipe.transform((currentDate.getTime() - firstDate.getTime()) / 1000);
              }
            }
            return '';
          },
        },
      },
      hover: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        xAxes: [
          {
            type: 'time',
            distribution: 'linear',
            time: {
              tooltipFormat: locale.longDateFormat('LT'),
              unit: 'hour',
              displayFormats: {
                hour: locale.longDateFormat('LT'),
              },
            },
            gridLines: {
              display: true,
              color: 'rgba(0,0,0,0.2)',
            },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 20,
              fontColor: this.defaultColor,
            },
          },
        ],
        yAxes: [
          {
            id: 'power',
            type: 'linear',
            position: 'left',
            ticks: {
              beginAtZero: true,
              callback: (value: number) => {
                const result = this.decimalPipe.transform(value, '1.0-0');
                return result ? parseFloat(result) : 0;
              },
              fontColor: this.defaultColor,
            },
            gridLines: {
              display: true,
              color: 'rgba(0,0,0,0.2)',
            },
          },
        ],
      },
      elements: {
        line: {
          stepped: true,
        },
      },
    };
    return options;
  }
}
