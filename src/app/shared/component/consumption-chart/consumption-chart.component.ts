import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { TranslateService } from '@ngx-translate/core';
import { AppCurrencyPipe } from 'app/shared/formatters/app-currency.pipe';
import { AppDurationPipe } from 'app/shared/formatters/app-duration.pipe';
import { ConsumptionUnit, Transaction } from 'app/types/Transaction';
import { Utils } from 'app/utils/Utils';
import { Chart, ChartColor, ChartData, ChartDataSets, ChartOptions, ChartTooltipItem } from 'chart.js';
import * as moment from 'moment';

import { CentralServerService } from '../../../services/central-server.service';
import { LocaleService } from '../../../services/locale.service';
import { AppDatePipe } from '../../formatters/app-date.pipe';
import { AppDecimalPipe } from '../../formatters/app-decimal-pipe';

@Component({
  selector: 'app-transaction-chart',
  templateUrl: 'consumption-chart.component.html',
})

export class ConsumptionChartComponent implements AfterViewInit {
  @Input() public transactionId!: number;
  @Input() public transaction!: Transaction;
  @Input() public ratio!: number;

  @ViewChild('primary', { static: true }) public primaryElement!: ElementRef;
  @ViewChild('accent', { static: true }) public accentElement!: ElementRef;
  @ViewChild('danger', { static: true }) public dangerElement!: ElementRef;
  @ViewChild('success', { static: true }) public successElement!: ElementRef;
  @ViewChild('chart', { static: true }) public chartElement!: ElementRef;
  @ViewChild('warning', { static: true }) public warningElement!: ElementRef;
  @ViewChild('purple', { static: true }) public purpleElement!: ElementRef;

  public loadAllConsumptions = false;
  public selectedUnit = ConsumptionUnit.KILOWATT;

  private graphCreated = false;
  private lineTension = 0;
  private data: ChartData = {
    labels: [],
    datasets: [],
  };
  private options!: ChartOptions;
  private chart!: Chart;
  private consumptionColor!: string;
  private instantPowerColor!: string;
  private amountColor!: string;
  private limitColor!: string;
  private stateOfChargeColor!: string;
  private instantVoltsColor!: string;
  private defaultColor!: string;
  private language!: string;

  constructor(
    private centralServerService: CentralServerService,
    private translateService: TranslateService,
    private localeService: LocaleService,
    private datePipe: AppDatePipe,
    private durationPipe: AppDurationPipe,
    private decimalPipe: AppDecimalPipe,
    private appCurrencyPipe: AppCurrencyPipe) {
    this.localeService.getCurrentLocaleSubject().subscribe((locale) => {
      this.language = locale.language;
    });
  }

  public ngAfterViewInit() {
    this.consumptionColor = this.getStyleColor(this.accentElement.nativeElement);
    this.instantPowerColor = this.getStyleColor(this.primaryElement.nativeElement);
    this.amountColor = this.getStyleColor(this.warningElement.nativeElement);
    this.stateOfChargeColor = this.getStyleColor(this.successElement.nativeElement);
    this.limitColor = this.getStyleColor(this.dangerElement.nativeElement);
    this.instantVoltsColor = this.getStyleColor(this.purpleElement.nativeElement);
    this.defaultColor = this.getStyleColor(this.chartElement.nativeElement);
    if (this.canDisplayGraph()) {
      this.prepareOrUpdateGraph();
    } else {
      this.refresh();
    }
  }

  public refresh() {
    this.centralServerService.getTransactionConsumption(this.transactionId, this.loadAllConsumptions)
      .subscribe((transaction) => {
        this.transaction = transaction;
        this.prepareOrUpdateGraph();
      }, (error) => {
        delete this.transaction;
      });
  }

  public loadAllConsumptionsChanged(matCheckboxChange: MatCheckboxChange) {
    if (matCheckboxChange) {
      this.loadAllConsumptions = matCheckboxChange.checked;
      this.refresh();
    }
  }

  public unitChanged(key: ConsumptionUnit) {
    this.selectedUnit = key;
    this.prepareOrUpdateGraph();
  }

  private getStyleColor(element: Element): string {
    const style = getComputedStyle(element);
    return style && style.color ? style.color : '';
  }

  private prepareOrUpdateGraph() {
    if (this.canDisplayGraph()) {
      if (!this.graphCreated) {
        this.graphCreated = true;
        this.options = this.createOptions();
        this.createGraphData();
        this.chart = new Chart(this.chartElement.nativeElement.getContext('2d'), {
          type: 'bar',
          data: this.data,
          options: this.options,
        });
      }
      this.createGraphData();
      this.refreshDataSets();
      this.chart.update();
    }
  }

  private createGraphData() {
    if (this.data.datasets && this.options.scales && this.options.scales.yAxes) {
      const datasets: ChartDataSets[] = [];
      // Dataset Instant Amps/Power
      datasets.push({
        name: (this.selectedUnit === ConsumptionUnit.AMPERE) ? 'instantAmps' : 'instantWatts',
        type: 'line',
        data: [],
        yAxisID: 'power',
        lineTension: this.lineTension,
        ...Utils.formatLineColor(this.instantPowerColor),
        label: this.translateService.instant((this.selectedUnit === ConsumptionUnit.AMPERE) ?
          'transactions.graph.amps' : 'transactions.graph.power'),
      });
      // Dataset Limit Amps/Power
      datasets.push({
        name: (this.selectedUnit === ConsumptionUnit.AMPERE) ? 'limitAmps' : 'limitWatts',
        type: 'line',
        data: [],
        hidden: true,
        yAxisID: 'power',
        lineTension: this.lineTension,
        ...Utils.formatLineColor(this.limitColor),
        label: this.translateService.instant((this.selectedUnit === ConsumptionUnit.AMPERE) ?
          'transactions.graph.limit_amps' : 'transactions.graph.limit_watts'),
      });
      // Dataset Cumulated Amps/Power
      datasets.push({
        name: (this.selectedUnit === ConsumptionUnit.AMPERE) ? 'cumulatedConsumptionAmps' : 'cumulatedConsumptionWh',
        type: 'line',
        data: [],
        hidden: true,
        yAxisID: 'power',
        lineTension: this.lineTension,
        ...Utils.formatLineColor(this.consumptionColor),
        label: this.translateService.instant((this.selectedUnit === ConsumptionUnit.AMPERE) ?
          'transactions.graph.energy_amps' : 'transactions.graph.energy'),
      });
      // Amount
      if (this.transaction.values.find((consumption) => consumption.cumulatedAmount > 0)) {
        // Dataset Amount
        datasets.push({
          name: 'cumulatedAmount',
          type: 'line',
          data: [],
          hidden: true,
          yAxisID: 'amount',
          lineTension: this.lineTension,
          ...Utils.formatLineColor(this.amountColor),
          label: this.translateService.instant('transactions.graph.cumulated_amount'),
        });
        // Y Axe: Amount
        if (!this.options.scales.yAxes.find(y => y.id === 'amount')) {
          this.options.scales.yAxes.push({
            id: 'amount',
            type: 'linear',
            position: 'right',
            display: 'auto',
            gridLines: {
              display: true,
              color: 'rgba(0,0,0,0.2)',
            },
            ticks: {
              callback: (value: number) => {
                const result = this.appCurrencyPipe.transform(value, this.transaction.priceUnit);
                return result ? result : '';
              },
              min: 0,
              fontColor: this.defaultColor,
            },
          });
        }
      }
      // Voltage
      if (this.transaction.values.find((consumption) => consumption.instantVolts > 0)) {
        // Dataset Amount
        datasets.push({
          name: 'instantVolts',
          type: 'line',
          data: [],
          hidden: true,
          yAxisID: 'voltage',
          lineTension: this.lineTension,
          ...Utils.formatLineColor(this.instantVoltsColor),
          label: this.translateService.instant('transactions.graph.voltage'),
        });
        // Y Axe: Amount
        if (!this.options.scales.yAxes.find(y => y.id === 'voltage')) {
          this.options.scales.yAxes.push({
            id: 'voltage',
            type: 'linear',
            position: 'right',
            display: 'auto',
            gridLines: {
              display: true,
              color: 'rgba(0,0,0,0.2)',
            },
            ticks: {
              callback: (value: number) => parseInt(this.decimalPipe.transform(value, '1.0-0')),
              min: 0,
              fontColor: this.defaultColor,
            },
          });
        }
      }
      // SoC
      if (this.transaction.stateOfCharge > 0 || (this.transaction.stop && this.transaction.stop.stateOfCharge > 0)) {
        // Dataset SoC
        datasets.push({
          name: 'stateOfCharge',
          type: 'line',
          data: [],
          yAxisID: 'percentage',
          lineTension: this.lineTension,
          ...Utils.formatLineColor(this.stateOfChargeColor),
          label: this.translateService.instant('transactions.graph.battery'),
        });
        // Y Axe: SoC
        if (!this.options.scales.yAxes.find(y => y.id === 'percentage')) {
          this.options.scales.yAxes.push(
            {
              id: 'percentage',
              type: 'linear',
              position: 'right',
              display: 'auto',
              gridLines: {
                display: true,
                color: 'rgba(0,0,0,0.2)',
              },
              ticks: {
                callback: (value) => `${value}%`,
                fontColor: this.defaultColor,
              },
            });
        }
      }
      // Assign
      this.data.labels = [];
      this.data.datasets = datasets;
    }
  }

  private getDataSet(name: string): number[] {
    if (this.data.datasets) {
      const dataSet = this.data.datasets.find((d) => (d as any).name === name);
      return dataSet ? dataSet.data as number[] : [];
    }
    return [];
  }

  private canDisplayGraph() {
    return this.transaction && this.transaction.values && this.transaction.values.length > 0;
  }

  private refreshDataSets() {
    if (this.data.datasets) {
      for (const key of Object.keys(this.data.datasets)) {
        this.data.datasets[key].data = [];
      }
      const instantPowerDataSet = this.getDataSet('instantWatts');
      const instantAmpsDataSet = this.getDataSet('instantAmps');
      const cumulatedConsumptionDataSet = this.getDataSet('cumulatedConsumptionWh');
      const cumulatedConsumptionAmpsDataSet = this.getDataSet('cumulatedConsumptionAmps');
      const cumulatedAmountDataSet = this.getDataSet('cumulatedAmount');
      const stateOfChargeDataSet = this.getDataSet('stateOfCharge');
      const instantVoltsDataSet = this.getDataSet('instantVolts');
      const limitWattsDataSet = this.getDataSet('limitWatts');
      const limitAmpsDataSet = this.getDataSet('limitAmps');
      const labels: number[] = [];
      for (const consumption of this.transaction.values) {
        labels.push(new Date(consumption.date).getTime());
        if (instantPowerDataSet) {
          instantPowerDataSet.push(consumption.instantWatts);
        }
        if (instantAmpsDataSet) {
          instantAmpsDataSet.push(consumption.instantAmps);
        }
        if (cumulatedConsumptionDataSet) {
          cumulatedConsumptionDataSet.push(consumption.cumulatedConsumptionWh);
        }
        if (cumulatedConsumptionAmpsDataSet) {
          cumulatedConsumptionAmpsDataSet.push(consumption.cumulatedConsumptionAmps);
        }
        if (cumulatedAmountDataSet) {
          cumulatedAmountDataSet.push(consumption.cumulatedAmount);
        }
        if (stateOfChargeDataSet) {
          stateOfChargeDataSet.push(consumption.stateOfCharge);
        }
        if (instantVoltsDataSet) {
          instantVoltsDataSet.push(consumption.instantVolts);
        }
        if (limitWattsDataSet) {
          limitWattsDataSet.push(consumption.limitWatts);
        }
        if (limitAmpsDataSet) {
          limitAmpsDataSet.push(consumption.limitAmps);
        }
      }
      this.data.labels = labels;
    }
  }

  private createOptions(): ChartOptions {
    const locale = moment.localeData(this.language);
    const options: ChartOptions = {
      animation: {
        duration: 0,
      },
      legend: {
        position: 'bottom',
        labels: {
          fontColor: this.defaultColor,
        },
      },
      responsive: true,
      maintainAspectRatio: false,
      // aspectRatio: this.ratio,
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
            if (this.data.datasets && data.datasets && tooltipItem.datasetIndex !== undefined) {
              const dataSet = data.datasets[tooltipItem.datasetIndex];
              if (dataSet && dataSet.data && tooltipItem.index !== undefined) {
                const value = dataSet.data[tooltipItem.index] as number;
                switch (this.data.datasets[tooltipItem.datasetIndex]['name']) {
                  case 'instantWatts':
                    return ' ' + this.decimalPipe.transform(value / 1000, '1.0-2') + ' kW';
                  case 'instantAmps':
                    return ' ' + this.decimalPipe.transform(value, '1.0-0') + ' A';
                  case 'cumulatedConsumptionWh':
                    return ' ' + this.decimalPipe.transform(value / 1000, '1.0-2') + ' kW.h';
                  case 'cumulatedConsumptionAmps':
                    return ' ' + this.decimalPipe.transform(value, '1.0-2') + ' A.h';
                  case 'limitWatts':
                    return ' ' + this.decimalPipe.transform(value / 1000, '1.0-2') + ' kW';
                  case 'limitAmps':
                    return ' ' + this.decimalPipe.transform(value, '1.0-0') + ' A';
                  case 'stateOfCharge':
                    return ` ${value} %`;
                  case 'instantVolts':
                    return ' ' + this.decimalPipe.transform(value, '1.0-0') + ' V';
                  case 'amount':
                    return this.appCurrencyPipe.transform(value, this.transaction.priceUnit) + '';
                  case 'cumulatedAmount':
                    return this.appCurrencyPipe.transform(value, this.transaction.priceUnit) + '';
                  default:
                    return value + '';
                }
              }
            }
            return '';
          },
          title: (item: ChartTooltipItem[], data: ChartData) => {
            if (data.labels && data.labels.length > 0) {
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
              unit: 'minute',
              displayFormats: {
                second: locale.longDateFormat('LTS'),
                minute: locale.longDateFormat('LT'),
              },
            },
            gridLines: {
              display: true,
              color: 'rgba(0,0,0,0.2)',
            },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 40,
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
              callback: (value: number) => (this.selectedUnit === ConsumptionUnit.KILOWATT) ? value / 1000 : value,
              fontColor: this.defaultColor,
              min: 0,
            },
            gridLines: {
              display: true,
              color: 'rgba(0,0,0,0.2)',
            },
          },
        ],
      },
    };
    return options;
  }
}
