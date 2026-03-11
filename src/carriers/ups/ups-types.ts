export interface UpsTokenResponse {
	token_type: string;
	access_token: string;
	expires_in: number;
}

export interface UpsRateRequestPayload {
	RateRequest: {
		Request: {
			RequestOption: 'Rate';
			TransactionReference: {
				CustomerContext: string;
			};
		};
		Shipment: {
			Shipper: {
				Name: string;
				Address: {
					AddressLine: string[];
					City: string;
					StateProvinceCode: string;
					PostalCode: string;
					CountryCode: string;
				};
			};
			ShipTo: {
				Name: string;
				Address: {
					AddressLine: string[];
					City: string;
					StateProvinceCode: string;
					PostalCode: string;
					CountryCode: string;
				};
			};
			Service?: {
				Code: string;
			};
			Package: Array<{
				PackagingType: {
					Code: string;
				};
				Dimensions: {
					UnitOfMeasurement: {
						Code: string;
					};
					Length: string;
					Width: string;
					Height: string;
				};
				PackageWeight: {
					UnitOfMeasurement: {
						Code: string;
					};
					Weight: string;
				};
			}>;
		};
	};
}

export interface UpsRateResponsePayload {
	RateResponse: {
		Response: {
			ResponseStatus: {
				Code: string;
				Description: string;
			};
		};
		RatedShipment: Array<{
			Service: {
				Code: string;
			};
			TotalCharges: {
				CurrencyCode: string;
				MonetaryValue: string;
			};
			BillingWeight?: {
				UnitOfMeasurement: {
					Code: string;
				};
				Weight: string;
			};
			GuaranteedDelivery?: {
				BusinessDaysInTransit?: string;
				DeliveryByTime?: string;
			};
		}>;
	};
}

export interface UpsErrorPayload {
	response?: {
		errors?: Array<{
			code?: string;
			message?: string;
		}>;
	};
}
