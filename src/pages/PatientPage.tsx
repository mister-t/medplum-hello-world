import { Loader, Tabs, Title } from '@mantine/core';
import { getReferenceString } from '@medplum/core';
import { Patient } from '@medplum/fhirtypes';
import { useResource } from '@medplum/react';
import { Fragment, useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { PatientHeader } from './PatientHeader';

export function PatientPage(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams();
  const patient = useResource<Patient>({ reference: `Patient/${id}` });

  interface LocationInfo {
    zip: string;
    name: string;
    lat: number;
    lon: number;
    country: string;
  }
  interface WeatherInfo {
    lat: number;
    lon: number;
    tz: string;
    date: string;
    units: string;
    weather_overview: string;
  }

  const [location, setLocation] = useState<LocationInfo | undefined>();
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | undefined>();

  const OPEN_WEATHER_API_KEY = import.meta.env.VITE_OPEN_WEATHER_API_KEY;

  useEffect(() => {
    const fetchLocation = (patient: Patient | undefined): string | undefined => {
      if (patient) {
        const { address } = patient
        if (address?.length) {
          return address[0].postalCode;
        }
      }
      return;
    };

    const fetchWeather = async (patient: Patient | undefined, openWeatherApiKey: string): Promise<void> => {
      const postalCode = fetchLocation(patient);

      if (postalCode) {
        const DIRECT_GEOCODE_BY_ZIP = `http://api.openweathermap.org/geo/1.0/zip?zip=${postalCode},US&appid=${openWeatherApiKey}`;

        const resp = await fetch(DIRECT_GEOCODE_BY_ZIP)
        let data;
        if (resp.ok) {
          data = await resp.json();
        }

        if (data) {
          setLocation(data);
          const { lat, lon } = data;
          const WEATHER_OVERVIEW_URL = `https://api.openweathermap.org/data/3.0/onecall/overview?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}`
          const result = await fetch(WEATHER_OVERVIEW_URL);
          if (result.ok) {
            const weather = await result.json();
            setWeatherInfo(weather);
          } else {
            console.log(result.statusText);
          }
        }
      }
    };

    fetchWeather(patient, OPEN_WEATHER_API_KEY)
  }, [patient]);

  if (!patient) {
    return <Loader />;
  }

  return (
    <Fragment key={getReferenceString(patient)}>
      <PatientHeader patient={patient} />
      <Title>
        FORECAST for {location?.zip}: {weatherInfo ? weatherInfo.weather_overview.substring(weatherInfo.weather_overview.search(/overall/i)) : ''}
      </Title>
      <Tabs onChange={(t) => navigate(`./${t}`)}>
        <Tabs.List bg="white">
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="timeline">Timeline</Tabs.Tab>
          <Tabs.Tab value="history">History</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <Outlet />
    </Fragment>
  );
}
