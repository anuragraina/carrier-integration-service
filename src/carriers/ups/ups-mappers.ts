import type { Address } from '../../domain/address.js';
import type { RateQuote } from '../../domain/rate-quote.js';
import type { RateRequest } from '../../domain/rate-request.js';
import type { UpsRateRequestPayload, UpsRateResponsePayload } from './ups-types.js';

const SERVICE_NAMES: Record<string, string> = {
	'01': 'UPS Next Day Air',
	'02': 'UPS 2nd Day Air',
	'03': 'UPS Ground',
};

function mapAddress(address: Address) {
	return {
		Name: address.name,
		Address: {
			AddressLine: [address.addressLine1, address.addressLine2].filter(
				(line): line is string => Boolean(line),
			),
			City: address.city,
			StateProvinceCode: address.stateProvinceCode,
			PostalCode: address.postalCode,
			CountryCode: address.countryCode,
		},
	};
}

export function buildUpsRateRequestPayload(request: RateRequest): UpsRateRequestPayload {
	const shipment: UpsRateRequestPayload['RateRequest']['Shipment'] = {
		Shipper: mapAddress(request.shipper),
		ShipTo: mapAddress(request.recipient),
		Package: request.packages.map(parcel => ({
			PackagingType: {
				Code: parcel.packagingCode,
			},
			Dimensions: {
				UnitOfMeasurement: {
					Code: parcel.dimensions.unit,
				},
				Length: parcel.dimensions.length.toString(),
				Width: parcel.dimensions.width.toString(),
				Height: parcel.dimensions.height.toString(),
			},
			PackageWeight: {
				UnitOfMeasurement: {
					Code: parcel.weight.unit,
				},
				Weight: parcel.weight.value.toString(),
			},
		})),
	};

	if (request.serviceLevel) {
		shipment.Service = { Code: request.serviceLevel.code };
	}

	return {
		RateRequest: {
			Request: {
				RequestOption: 'Rate',
				TransactionReference: {
					CustomerContext: 'order-123',
				},
			},
			Shipment: shipment,
		},
	};
}

export function normalizeUpsRateResponse(response: UpsRateResponsePayload): RateQuote[] {
	return response.RateResponse.RatedShipment.map(ratedShipment => ({
		carrier: 'ups',
		serviceCode: ratedShipment.Service.Code,
		serviceName:
			SERVICE_NAMES[ratedShipment.Service.Code] ?? `UPS ${ratedShipment.Service.Code}`,
		totalCharge: {
			currencyCode: ratedShipment.TotalCharges.CurrencyCode,
			amount: ratedShipment.TotalCharges.MonetaryValue,
		},
		billingWeight: ratedShipment.BillingWeight
			? {
					unit: ratedShipment.BillingWeight.UnitOfMeasurement.Code,
					value: ratedShipment.BillingWeight.Weight,
				}
			: undefined,
		estimatedDeliveryDate: ratedShipment.GuaranteedDelivery?.BusinessDaysInTransit,
		metadata: ratedShipment.GuaranteedDelivery?.DeliveryByTime
			? {
					deliveryByTime: ratedShipment.GuaranteedDelivery.DeliveryByTime,
				}
			: {},
	}));
}
